import { prisma } from "@/lib/prisma";
import { processIngest, type IngestSummary } from "./ingest";
import { getHttpFailures, resetHttpState, withCollectionBudget } from "./http";
import { getSourceConnectors } from "./sources";
import { classifyJob } from "./job-classifier";
import { getRedis } from "@/lib/redis";
import { randomUUID } from "node:crypto";
import type { SourceConnector, CollectionCoverage } from "./sources/types";
import { reconcileCatalog } from "./reconcile-catalog";
import { scheduleSources } from "./schedule";
import { startProgress, finishProgress, type SourceProgress } from "./progress";

export type IngestionRunResult = {
  source: string;
  label: string;
  ok: boolean;
  fetched: number;
  durationMs: number;
  summary?: IngestSummary;
  error?: string;
  warnings?: string[];
  coverage?: CollectionCoverage;
  expired?: number;
};

/**
 * Les connecteurs visent des hôtes différents : les faire tourner en parallèle
 * ne concentre aucune pression sur une source (le throttle de `http.ts` reste
 * par hôte) et divise la durée du cycle par le nombre de sources actives.
 */
const SOURCE_CONCURRENCY = 4;

export class IngestionAlreadyRunningError extends Error {
  constructor() {
    super("Une ingestion est déjà en cours. Réessayez après sa fin.");
    this.name = "IngestionAlreadyRunningError";
  }
}

/**
 * Lance toutes les sources activées et ingère leurs offres via le pipeline
 * commun (normalisation, déduplication, rejet hors périmètre, indexation).
 * Une source en échec n'interrompt pas les autres. Chaque passage est archivé
 * dans `ingest_runs` : c'est la base du suivi de santé du panneau admin.
 */
export async function runIngestion(options: { signal?: AbortSignal } = {}): Promise<IngestionRunResult[]> {
  // Le cron, l'ingestion au démarrage et le bouton admin partagent ce verrou.
  const redis = getRedis();
  const lock = "jobly:ingestion:lock";
  const token = randomUUID();
  const acquired = await redis.set(lock, token, "EX", 180, "NX");
  if (!acquired) throw new IngestionAlreadyRunningError();
  let lostLock = false;
  const heartbeat = setInterval(() => {
    redis
      .eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('expire',KEYS[1],180) else return 0 end",
        1,
        lock,
        token,
      )
      .then((renewed) => {
        if (!renewed) lostLock = true;
      })
      .catch(() => {
        lostLock = true;
      });
  }, 60_000);
  heartbeat.unref();
  try {
    // Nouveau cycle ; les délais Retry-After encore actifs restent respectés.
    resetHttpState();

    const enabled = scheduleSources((await getSourceConnectors()).filter((connector) => {
      if (connector.isEnabled()) return true;
      console.log(`[ingestion] ${connector.label} : désactivée dans le catalogue, ignorée.`);
      return false;
    }));
    const progress = startProgress(token, enabled);

    const results: IngestionRunResult[] = [];
    // Chaque créneau libéré prend la source suivante, sans attendre les sources lentes.
    let cursor = 0;
    const collect = async (): Promise<void> => {
      while (!lostLock && !options.signal?.aborted) {
        const index = cursor++;
        if (index >= enabled.length) return;
        results[index] = await runConnector(enabled[index], options.signal, token, progress.sources[index]);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(SOURCE_CONCURRENCY, enabled.length) }, collect),
    );
    if (lostLock) throw new Error("Verrou d'ingestion perdu ; cycle interrompu.");
    if (!options.signal?.aborted) { const { verifyKnownOfferLinks } = await import("./verify-links"); await verifyKnownOfferLinks().catch((error) => console.error("[links] Vérification partielle", error)); }
    return results;
  } finally {
    finishProgress();
    clearInterval(heartbeat);
    await redis
      .eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
        1,
        lock,
        token,
      )
      .catch(() => undefined);
  }
}

async function runConnector(connector: SourceConnector, signal?: AbortSignal, cycleId?: string, progress?: SourceProgress): Promise<IngestionRunResult> {
  const started = Date.now();
  if (progress) { progress.phase = "RUNNING"; progress.startedAt = new Date(started).toISOString(); }
  const seen = new Set<string>();
  const summary: IngestSummary = { received: 0, created: 0, updated: 0, duplicates: 0, rejected: 0, errors: [], indexingErrors: 0 };
  const onBatch = async (batch: import("./normalize").RawOffer[]) => {
    const offers = batch.filter((offer) => !seen.has(offer.sourceUrl) && (offer.countryCode ?? "FR").toUpperCase() === "FR" && (connector.personal || classifyJob(offer.title, offer.description).universe !== "OTHER"));
    if (!offers.length) return;
    const part = await processIngest(connector.sourceSite, offers, { acceptedContracts: connector.acceptedContracts, personal: connector.personal });
    for (const key of ["received", "created", "updated", "duplicates", "rejected", "indexingErrors"] as const) summary[key] += part[key] ?? 0;
    summary.errors.push(...(part.errors ?? []).slice(0, 100 - summary.errors.length));
    offers.forEach((offer) => seen.add(offer.sourceUrl));
    if (progress) progress.fetched = seen.size;
  };
  const failureOffset = getHttpFailures().length;
  try {
    const configuredBudget = Number(process.env.INGEST_SOURCE_TIMEOUT_SECONDS ?? (connector.personal ? 180 : 900));
    const seconds =
      Number.isFinite(configuredBudget) && configuredBudget >= 30
        ? Math.min(configuredBudget, 3600)
        : 900;
    let budgetExpired = false;
    const fetched = await withCollectionBudget(
      seconds * 1000,
      () => connector.fetchOffers({ onBatch }),
      () => {
        budgetExpired = true;
      },
      signal,
    );
    // Le périmètre courant est France + stage/alternance tech ; les anciens
    // connecteurs internationaux restent disponibles dans le dépôt, hors cycle.
    const offers = fetched.filter(
      (offer) =>
        (offer.countryCode ?? "FR").toUpperCase() === "FR" &&
        (connector.personal || classifyJob(offer.title, offer.description).universe !== "OTHER"),
    );
    const prefixes = connector.requestPrefixes ?? [
      `https://www.${connector.sourceSite}/`,
      `https://${connector.sourceSite}/`,
    ];
    const failures = getHttpFailures()
      .slice(failureOffset)
      .filter((failure) => prefixes.some((prefix) => failure.url.startsWith(prefix)));
    const warnings = [...(connector.warnings ?? [])];
    if (budgetExpired) warnings.push("Budget de temps atteint ; collecte partielle conservée");
    if (failures.length)
      warnings.push(
        `${failures.length} requête(s) en échec : ${[...new Set(failures.map((failure) => failure.message))].join(", ")}`,
      );
    await onBatch(offers);
    if (summary.indexingErrors)
      warnings.push(`${summary.indexingErrors} lot(s) non indexé(s) ; réparation programmée`);
    const expired = await reconcileCatalog(connector, new Date(started), warnings);
    const durationMs = Date.now() - started;
    console.log(
      `[ingestion] ${connector.label} : ${offers.length} récupérées → ` +
        `${summary.created} créées, ${summary.updated} maj, ${summary.duplicates} doublons, ` +
        `${summary.rejected} rejetées (${durationMs} ms)`,
    );
    const result: IngestionRunResult = {
      source: connector.sourceSite,
      label: connector.label,
      ok: warnings.length === 0,
      fetched: offers.length,
      durationMs,
      summary,
      expired,
      ...(connector.coverage ? { coverage: connector.coverage } : {}),
      ...(warnings.length ? { warnings, error: warnings.join(" ; ") } : {}),
    };
    await recordRun(result, started, cycleId);
    if (progress) { progress.phase = result.ok ? "DONE" : "PARTIAL"; progress.completedAt = new Date().toISOString(); }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingestion] ${connector.label} : échec — ${message}`);
    const result: IngestionRunResult = {
      source: connector.sourceSite,
      label: connector.label,
      ok: false,
      fetched: seen.size,
      summary,
      durationMs: Date.now() - started,
      error: message,
    };
    await recordRun(result, started, cycleId);
    if (progress) { progress.phase = seen.size ? "PARTIAL" : "FAILED"; progress.completedAt = new Date().toISOString(); }
    return result;
  }
}

/** L'archivage du bilan ne doit jamais faire échouer l'ingestion elle-même. */
async function recordRun(result: IngestionRunResult, started: number, cycleId?: string): Promise<void> {
  try {
    await prisma.ingestRun.create({
      data: {
        startedAt: new Date(started),
        completedAt: new Date(),
        cycleId,
        sourceSite: result.source,
        label: result.label,
        ok: result.ok,
        fetched: result.fetched,
        created: result.summary?.created ?? 0,
        updated: result.summary?.updated ?? 0,
        duplicates: result.summary?.duplicates ?? 0,
        rejected: result.summary?.rejected ?? 0,
        durationMs: result.durationMs,
        error: result.error?.slice(0, 500) ?? null,
        ...(result.coverage
          ? { coverageJson: { ...result.coverage, expired: result.expired ?? 0 } }
          : {}),
      },
    });
  } catch (err) {
    console.error("[ingestion] Archivage du bilan impossible :", err);
  }
}

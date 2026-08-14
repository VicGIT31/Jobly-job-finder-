import { prisma } from "@/lib/prisma";
import { processIngest, type IngestSummary } from "./ingest";
import { resetHttpState } from "./http";
import { ApecConnector } from "./sources/apec";
import { ArbetsformedlingenConnector } from "./sources/arbetsformedlingen";
import { AtsBoardsConnector } from "./sources/ats-boards";
import { FranceTravailConnector } from "./sources/france-travail";
import { FreeWorkConnector } from "./sources/free-work";
import { HelloWorkConnector } from "./sources/hellowork";
import { JSearchConnector } from "./sources/jsearch";
import { LinkedInConnector } from "./sources/linkedin";
import { TheMuseConnector } from "./sources/themuse";
import type { SourceConnector } from "./sources/types";

const CONNECTORS: SourceConnector[] = [
  new FranceTravailConnector(),
  new ApecConnector(),
  new LinkedInConnector(),
  new HelloWorkConnector(),
  new FreeWorkConnector(),
  new JSearchConnector(),
  new TheMuseConnector(),
  // Sources internationales (Europe/Asie) — voir SOURCES_EUROPE_ASIA.md.
  // Périmètre de contrats plus large que les sources françaises ci-dessus :
  // chacune déclare son propre `acceptedContracts`.
  new ArbetsformedlingenConnector(),
  new AtsBoardsConnector(),
];

export type IngestionRunResult = {
  source: string;
  label: string;
  ok: boolean;
  fetched: number;
  durationMs: number;
  summary?: IngestSummary;
  error?: string;
};

/**
 * Les connecteurs visent des hôtes différents : les faire tourner en parallèle
 * ne concentre aucune pression sur une source (le throttle de `http.ts` reste
 * par hôte) et divise la durée du cycle par le nombre de sources actives.
 */
const SOURCE_CONCURRENCY = 4;

/**
 * Lance toutes les sources activées et ingère leurs offres via le pipeline
 * commun (normalisation, déduplication, rejet hors périmètre, indexation).
 * Une source en échec n'interrompt pas les autres. Chaque passage est archivé
 * dans `ingest_runs` : c'est la base du suivi de santé du panneau admin.
 */
export async function runIngestion(): Promise<IngestionRunResult[]> {
  // Nouveau cycle : les hôtes coupés au cycle précédent redeviennent joignables.
  resetHttpState();

  const enabled = CONNECTORS.filter((connector) => {
    if (connector.isEnabled()) return true;
    console.log(`[ingestion] ${connector.label} : désactivée (identifiants absents), ignorée.`);
    return false;
  });

  const results: IngestionRunResult[] = [];
  // Traitement par vagues : borne le nombre de sources actives simultanément.
  for (let i = 0; i < enabled.length; i += SOURCE_CONCURRENCY) {
    const wave = enabled.slice(i, i + SOURCE_CONCURRENCY);
    results.push(...(await Promise.all(wave.map((connector) => runConnector(connector)))));
  }

  return results;
}

async function runConnector(connector: SourceConnector): Promise<IngestionRunResult> {
  const started = Date.now();
  try {
    const offers = await connector.fetchOffers();
    const summary = await processIngest(connector.sourceSite, offers, {
      acceptedContracts: connector.acceptedContracts,
    });
    const durationMs = Date.now() - started;
    console.log(
      `[ingestion] ${connector.label} : ${offers.length} récupérées → ` +
        `${summary.created} créées, ${summary.updated} maj, ${summary.duplicates} doublons, ` +
        `${summary.rejected} rejetées (${durationMs} ms)`,
    );
    const result: IngestionRunResult = {
      source: connector.sourceSite,
      label: connector.label,
      ok: true,
      fetched: offers.length,
      durationMs,
      summary,
    };
    await recordRun(result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingestion] ${connector.label} : échec — ${message}`);
    const result: IngestionRunResult = {
      source: connector.sourceSite,
      label: connector.label,
      ok: false,
      fetched: 0,
      durationMs: Date.now() - started,
      error: message,
    };
    await recordRun(result);
    return result;
  }
}

/** L'archivage du bilan ne doit jamais faire échouer l'ingestion elle-même. */
async function recordRun(result: IngestionRunResult): Promise<void> {
  try {
    await prisma.ingestRun.create({
      data: {
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
      },
    });
  } catch (err) {
    console.error("[ingestion] Archivage du bilan impossible :", err);
  }
}

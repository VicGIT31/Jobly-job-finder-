/** Vérification/export des vraies offres sans PostgreSQL, Redis ou Meilisearch. */
import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getSourceConnectors } from "../src/server/ingest/sources";
import { PublicBoardConnector } from "../src/server/ingest/sources/public-boards";
import { getHttpFailures, resetHttpState } from "../src/server/ingest/http";
import { isTechOffer } from "../src/server/ingest/scope";
import { normalizeOffer, rawOfferSchema, type RawOffer } from "../src/server/ingest/normalize";
import { computeDedupHash } from "../src/server/ingest/dedup";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
async function main(): Promise<void> {
  if (arg("--sources")) process.env.INGEST_SOURCES = arg("--sources");
  const limit = Number(arg("--limit") ?? 5000);
  const pages = Number(arg("--pages") ?? 100);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 5000 ||
    !Number.isInteger(pages) ||
    pages < 1 ||
    pages > 100
  )
    throw new Error("--limit : 1..5000 ; --pages : 1..100");
  const connectors = (await getSourceConnectors()).filter((source) => source.isEnabled());
  const offers = new Map<string, RawOffer>();
  const results = [];
  resetHttpState();
  for (const original of connectors) {
    const connector =
      original instanceof PublicBoardConnector
        ? new PublicBoardConnector({ ...original.definition, maxOffers: limit, maxPages: pages })
        : original;
    const started = Date.now();
    const failureOffset = getHttpFailures().length;
    try {
      const fetched = await connector.fetchOffers();
      let accepted = 0;
      for (const raw of fetched) {
        const parsed = rawOfferSchema.safeParse(raw);
        if (!parsed.success || !isTechOffer(parsed.data.title, parsed.data.description)) continue;
        try {
          const normalized = normalizeOffer(parsed.data);
          if (normalized.countryCode !== "FR") continue;
          const hash = computeDedupHash(
            normalized.title,
            normalized.companyName,
            normalized.city,
            normalized.sourceUrl,
          );
          offers.set(hash, {
            ...parsed.data,
            sourceSite: parsed.data.sourceSite ?? connector.sourceSite,
          });
          accepted++;
        } catch {
          /* Contrat hors périmètre : non exporté. */
        }
      }
      const failures = getHttpFailures().slice(failureOffset);
      const warnings = [
        ...(connector.warnings ?? []),
        ...new Set(failures.map((failure) => failure.message)),
      ];
      results.push({
        source: connector.label,
        status: warnings.length ? "partial" : "ok",
        fetched: fetched.length,
        accepted,
        warnings,
        durationMs: Date.now() - started,
        ...(connector.coverage ? { coverage: connector.coverage } : {}),
        ...(connector instanceof PublicBoardConnector && connector.rejectedPostings.length
          ? { excluded: connector.rejectedPostings }
          : {}),
      });
      console.log(
        `${connector.label}: ${accepted} offre(s) valide(s) — ${warnings.length ? warnings.join(" ; ") : "OK"}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        source: connector.label,
        status: "failed",
        error: message,
        durationMs: Date.now() - started,
      });
      console.log(`${connector.label}: échec — ${message}`);
    }
  }
  const output = resolve(arg("--output") ?? "reports/collected-offers.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        scope: "France / tech / stages et alternances",
        results,
        offers: [...offers.values()],
      },
      null,
      2,
    ),
  );
  console.log(`${offers.size} offre(s) distincte(s). Export : ${output}`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

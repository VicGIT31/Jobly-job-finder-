import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchJson, fetchText, resetHttpState } from "../src/server/ingest/http";
import { loadSourceCatalog } from "../src/server/ingest/sources/catalog";
import { boardEndpoint, PublicBoardConnector } from "../src/server/ingest/sources/public-boards";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
async function main(): Promise<void> {
  const maxOffers = Number(arg("--limit") ?? 10);
  const maxPages = Number(arg("--pages") ?? 2);
  if (![maxOffers, maxPages].every((value) => Number.isSafeInteger(value) && value > 0))
    throw new Error("--limit et --pages doivent être des entiers strictement positifs");
  const catalog = await loadSourceCatalog();
  const selected = arg("--sources")?.split(",");
  if (selected?.some((id) => !catalog.some((source) => source.id === id)))
    throw new Error("ID de source inconnu");
  const sources = catalog.filter((source) => !selected || selected.includes(source.id));
  if (process.argv.includes("--list")) {
    console.table(
      sources.map((source) => ({
        id: source.id,
        actif: source.enabled,
        format: source.kind,
        endpoint: boardEndpoint(source),
      })),
    );
    return;
  }
  resetHttpState();
  const results = [];
  for (const source of sources) {
    const endpoint =
      source.kind === "html" ? (source.sitemapUrls[0] ?? source.url) : boardEndpoint(source);
    const started = Date.now();
    if (!source.enabled && !process.argv.includes("--include-disabled")) {
      results.push({ id: source.id, endpoint, status: "disabled", note: source.notes });
      console.log(`${source.id}: désactivée (${source.notes ?? "catalogue"})`);
      continue;
    }
    try {
      if (process.argv.includes("--collect")) {
        const connector = new PublicBoardConnector({
          ...source,
          maxOffers,
          maxPages,
          maxSitemaps: 3,
        });
        const offers = await connector.fetchOffers();
        results.push({
          id: source.id,
          endpoint,
          status: connector.warnings.length ? "partial" : "collected",
          offers: offers.length,
          warnings: connector.warnings,
          sampleUrls: offers.slice(0, 3).map((offer) => offer.sourceUrl),
          durationMs: Date.now() - started,
        });
        console.log(
          `${source.id}: ${offers.length} offre(s) ciblée(s), ${connector.warnings.length} avertissement(s)`,
        );
      } else {
        const options = { retries: 0, timeoutMs: 15_000, minIntervalMs: 750 };
        if (source.kind === "html") {
          const body = await fetchText(endpoint, options);
          if (!body || (source.sitemapUrls.length && !/<(?:urlset|sitemapindex)\b/.test(body)))
            throw new Error("Page ou sitemap absent/illisible");
        } else {
          const data = await fetchJson<Record<string, unknown> | unknown[]>(
            endpoint,
            source.kind === "workday"
              ? {
                  ...options,
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    limit: 1,
                    offset: 0,
                    searchText: "stage",
                    appliedFacets: {},
                  }),
                }
              : options,
          );
          const list = Array.isArray(data)
            ? data
            : (data?.jobs ?? data?.jobPostings ?? data?.content);
          if (!Array.isArray(list)) throw new Error("Endpoint JSON absent ou format modifié");
        }
        results.push({
          id: source.id,
          endpoint,
          status: "reachable",
          durationMs: Date.now() - started,
        });
        console.log(`${source.id}: endpoint public accessible`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: source.id,
        endpoint,
        status: "failed",
        error: message,
        durationMs: Date.now() - started,
      });
      console.log(`${source.id}: échec — ${message}`);
    }
  }
  const output = resolve(arg("--output") ?? "reports/source-health.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: process.argv.includes("--collect") ? "collection" : "endpoint-only",
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Rapport : ${output}`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

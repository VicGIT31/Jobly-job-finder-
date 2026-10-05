import "./load-env";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sourceDefinitionSchema } from "../src/server/ingest/sources/catalog";
import { boardEndpoint, PublicBoardConnector } from "../src/server/ingest/sources/public-boards";
import { fetchJson, mapPool, resetHttpState } from "../src/server/ingest/http";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** Vérifie un inventaire explicite d'entreprises ; aucun scan de domaines ni clé. */
async function main(): Promise<void> {
  const filename = arg("--input") ?? "config/france-career-candidates.json";
  const inputs: unknown = JSON.parse(await readFile(filename, "utf8"));
  if (!Array.isArray(inputs)) throw new Error("Un tableau de sources est attendu");
  const candidates = inputs.map((input) => sourceDefinitionSchema.parse(input));
  const selected = arg("--sources")?.split(",");
  const sources = candidates.filter((source) => !selected || selected.includes(source.id));
  if (selected?.some((id) => !candidates.some((source) => source.id === id)))
    throw new Error("ID de candidat inconnu");
  resetHttpState();
  const results = await mapPool(sources, 4, async (source) => {
    const endpoint = boardEndpoint(source);
    try {
      if (source.kind === "html")
        throw new Error("Utiliser sources:check pour les pages HTML et sitemaps");
      const url = source.kind === "smartrecruiters" ? `${endpoint}?limit=1` : endpoint;
      const data = await fetchJson<Record<string, unknown> | unknown[]>(url, {
        retries: 0,
        timeoutMs: 15_000,
        minIntervalMs: 1000,
        ...(source.kind === "workday"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ limit: 1, offset: 0, searchText: "", appliedFacets: {} }),
            }
          : {}),
      });
      const jobs = Array.isArray(data) ? data : (data?.jobs ?? data?.content ?? data?.jobPostings);
      if (!Array.isArray(jobs)) throw new Error("Endpoint absent ou format non exploitable");
      const total = Array.isArray(data)
        ? data.length
        : Number(data?.totalFound ?? data?.total ?? jobs.length);
      let offers = undefined;
      let warnings: string[] = [];
      if (process.argv.includes("--collect")) {
        const connector = new PublicBoardConnector({ ...source, maxPages: 2, maxOffers: 50 });
        offers = await connector.fetchOffers();
        warnings = connector.warnings;
      }
      console.log(
        `${source.label} (${source.kind}) : ${total} annonces publiques${offers ? `, ${offers.length} stages/alternances tech FR` : ""}`,
      );
      // Certains ATS renvoient un tableau vide même pour un slug inexistant.
      return {
        source,
        endpoint,
        status: total > 0 ? "reachable" : "empty",
        total,
        offers,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${source.label} (${source.kind}) : ${message}`);
      return { source, endpoint, status: "failed", error: message };
    }
  });
  const output = resolve(arg("--output") ?? "reports/france-career-expansion.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(
    `${results.filter((result) => result.status === "reachable").length}/${results.length} endpoints accessibles. Rapport : ${output}`,
  );
  // Les candidats absents sont normaux : aucune source n'est activée implicitement.
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

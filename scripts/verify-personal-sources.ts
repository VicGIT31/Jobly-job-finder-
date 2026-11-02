/** Real-network benchmark; no database or private user data is read. */
import { mkdir, writeFile } from "node:fs/promises";
import { personalConnectors } from "../src/server/ingest/sources/personal";
import { withCollectionBudget, resetHttpState, mapPool, fetchWithRetry } from "../src/server/ingest/http";
import { normalizeOffer, rawOfferSchema, type RawOffer } from "../src/server/ingest/normalize";
import { classifyJob, fold } from "../src/lib/job-taxonomy";
import { distanceKm, TOULOUSE } from "../src/lib/geo";

async function main() {
  const cold = process.argv.includes("--cold");
  process.env.INGEST_CACHE_DIR = cold ? `.cache/v030-cold-${Date.now()}` : ".cache/v030-live";
  resetHttpState();
  const started = Date.now(), collectedAt = new Date().toISOString();
  let firstUsefulMs: number | null = null;
  const all = personalConnectors();
  const filter = process.argv.find((value) => value.startsWith("--sources="))?.slice(10).split(",");
  const entries = filter ? all.filter(({ id }) => filter.includes(id)) : all;
  const results = await mapPool(entries, 4, async ({ id, connector }) => {
    const sourceStarted = Date.now();
    try {
      const raw = await withCollectionBudget(180000, () => connector.fetchOffers());
      const offers: RawOffer[] = [], rejects: string[] = [];
      for (const offer of raw) {
        try { const parsed = rawOfferSchema.parse(offer); const normalized = normalizeOffer(parsed, { personal: true, acceptedContracts: connector.acceptedContracts });
        if (normalized.validThrough && normalized.validThrough.getTime() <= started) throw new Error("Expiration annoncée à la source");
        if (normalized.publishedAt && (normalized.publishedAt.getTime() < started - 60 * 86400000 || normalized.publishedAt.getTime() > started + 86400000)) throw new Error("Publication hors fenêtre de 60 jours");
        offers.push({ ...parsed, sourceSite: connector.sourceSite }); } catch (error) { rejects.push(String(error).slice(0, 200)); }
      }
      if (offers.length && firstUsefulMs === null) firstUsefulMs = Date.now() - started;
      const result = { id, source: connector.label, durationMs: Date.now() - sourceStarted, finishedMs: Date.now() - started, fetched: raw.length, unique: new Set(offers.map((offer) => offer.sourceUrl)).size, rejected: rejects, warnings: [...connector.warnings], offers };
      console.log(`${id}: ${offers.length} offres, ${result.durationMs} ms, ${result.warnings.join(" ; ")}`);
      return result;
    } catch (error) { console.log(`${id}: ${String(error)}`); return { id, source: connector.label, durationMs: Date.now() - sourceStarted, finishedMs: Date.now() - started, fetched: 0, unique: 0, rejected: [], warnings: [String(error)], offers: [] as RawOffer[] }; }
  });
  const offers = [...new Map(results.flatMap((result) => result.offers).map((offer) => [offer.sourceUrl, offer])).values()];
  const queries = [
    { name: "Commerce Toulouse 30 km", universe: "COMMERCE", family: "commerce", center: TOULOUSE, radius: 30 },
    { name: "Marketing Toulouse 30 km", universe: "COMMERCE", family: "MARKETING", center: TOULOUSE, radius: 30 },
    { name: "ASV Toulouse 30 km", universe: "ASV", center: TOULOUSE, radius: 30 },
    { name: "ASV France", universe: "ASV" },
    { name: "Commerce Lyon 30 km", universe: "COMMERCE", center: { lat: 45.764, lng: 4.8357 }, radius: 30 },
    { name: "Marketing Paris 30 km", universe: "COMMERCE", family: "MARKETING", center: { lat: 48.8566, lng: 2.3522 }, radius: 30 },
  ].map((query) => {
    const found = offers.filter((offer) => { const job = classifyJob(offer.title); return job.universe === query.universe && (!query.family || (query.family === "commerce" ? !["MARKETING", "COMMUNICATION"].includes(job.family) : job.family === query.family)) && (!query.center || offer.latitude != null && offer.longitude != null && distanceKm(query.center, { lat: offer.latitude, lng: offer.longitude }) <= query.radius!); });
    return { name: query.name, unique: found.length, sample: found.slice(0, 10).map((offer) => ({ title: offer.title, city: offer.city, source: offer.sourceSite, url: offer.sourceUrl })) };
  });
  const samples = results.flatMap((result) => result.offers.slice(0, 2));
  const links = await mapPool(samples, 3, async (offer) => {
    try { const response = await fetchWithRetry(offer.sourceUrl, { retries: 0, timeoutMs: 15000, cacheTtlMs: 0 }); if (!response) throw new Error("Aucune réponse HTTP exploitable"); const body = await response.text(); return { title: offer.title, url: offer.sourceUrl, status: response.status, finalUrl: response.url, titlePresent: fold(body).includes(fold(offer.title)), expiredNotice: /offre (?:n.est plus|n’est plus|a ete pourvue|a été pourvue)|job (?:has expired|is no longer available)/i.test(body) }; } catch (error) { return { title: offer.title, url: offer.sourceUrl, error: String(error) }; }
  });
  const report = { version: "0.3.0", collectedAt, simulated: false, cache: cold ? "vide au lancement" : "cache public existant", firstUsefulMs, totalDurationMs: Date.now() - started, offers: offers.length, queries, links, results };
  await mkdir("reports/v0.3.0", { recursive: true }); await writeFile("reports/v0.3.0/live-sources.json", JSON.stringify(report, null, 2));
  await writeFile("reports/v0.3.0/live-offers.json", JSON.stringify(offers, null, 2));
  console.log(JSON.stringify({ firstUsefulMs, totalDurationMs: report.totalDurationMs, offers: offers.length, queries: queries.map(({ name, unique }) => ({ name, unique })) }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

import "./load-env";
import { readFile } from "node:fs/promises";
import { processIngest } from "../src/server/ingest/ingest";
import { rawOfferSchema, normalizeOffer, type RawOffer } from "../src/server/ingest/normalize";
import { isTechOffer } from "../src/server/ingest/scope";
import { prisma } from "../src/lib/prisma";

/** Import local de l'export collect:offers, sans rappeler les sites sources. */
async function main(): Promise<void> {
  const filename = process.argv[2];
  if (!filename) throw new Error("Usage : npm run ingest:file -- reports/collected-offers.json");
  const payload: unknown = JSON.parse(await readFile(filename, "utf8"));
  const inputs =
    typeof payload === "object" && payload !== null && "offers" in payload
      ? (payload as { offers: unknown }).offers
      : payload;
  if (!Array.isArray(inputs))
    throw new Error("Fichier attendu : tableau d'offres ou export collect:offers");
  const sources = new Map<string, RawOffer[]>();
  let rejected = 0;
  for (const input of inputs) {
    const parsed = rawOfferSchema.safeParse(input);
    if (!parsed.success) {
      rejected++;
      continue;
    }
    try {
      const offer = normalizeOffer(parsed.data);
      if (offer.countryCode !== "FR" || !isTechOffer(offer.title, offer.description)) {
        rejected++;
        continue;
      }
      const source = offer.sourceSite ?? new URL(offer.sourceUrl).hostname.replace(/^www\./, "");
      const group = sources.get(source) ?? [];
      group.push(parsed.data);
      sources.set(source, group);
    } catch {
      rejected++;
    }
  }
  console.log(`${rejected} offre(s) invalide(s) ou hors périmètre ignorée(s).`);
  for (const [source, offers] of sources) {
    const summary = await processIngest(source, offers);
    console.log(
      `${source}: ${summary.created} créée(s), ${summary.duplicates} doublon(s), ${summary.rejected} rejet(s)`,
    );
  }
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

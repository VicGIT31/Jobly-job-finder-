import { Meilisearch } from "meilisearch";

export const OFFERS_INDEX = "job_offers";

const globalForMeili = globalThis as unknown as { meili?: Meilisearch };

export function getMeili(): Meilisearch {
  if (!globalForMeili.meili) {
    globalForMeili.meili = new Meilisearch({
      host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return globalForMeili.meili;
}

/** Configuration de l'index (idempotente) : facettes, tri, géo, typo-tolérance. */
export async function configureOffersIndex(): Promise<void> {
  const meili = getMeili();
  const index = meili.index(OFFERS_INDEX);
  await index.updateSettings({
    searchableAttributes: ["title", "companyName", "sector", "city", "descriptionText"],
    filterableAttributes: [
      "contractType",
      "city",
      "remotePolicy",
      "sector",
      "educationLevel",
      "publishedAtTs",
      "status",
      "companySlug",
      "sourceSite",
      "_geo",
    ],
    sortableAttributes: ["publishedAtTs"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    pagination: { maxTotalHits: 1000 },
  });
}

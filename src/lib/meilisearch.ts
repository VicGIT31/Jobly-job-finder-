import { Meilisearch } from "meilisearch";

export const OFFERS_INDEX = "job_offers";

const globalForMeili = globalThis as unknown as { meili?: Meilisearch };

export function getMeili(): Meilisearch {
  if (!globalForMeili.meili) {
    globalForMeili.meili = new Meilisearch({
      host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY,
      // Next.js met en cache les fetch() sortants (Data Cache), y compris les
      // POST /search du client : sans no-store, les résultats de recherche
      // restent figés à leur première exécution après le build.
      requestInit: { cache: "no-store" },
    });
  }
  return globalForMeili.meili;
}

/** Configuration de l'index (idempotente) : facettes, tri, géo, typo-tolérance. */
export async function configureOffersIndex(): Promise<void> {
  const meili = getMeili();
  const index = meili.index(OFFERS_INDEX);
  const task = await index.updateSettings({
    searchableAttributes: [
      "title",
      "jobFamily",
      "tags",
      "qualificationText",
      "companyName",
      "sector",
      "city",
      "descriptionText",
    ],
    filterableAttributes: [
      "id",
      "contractType",
      "city",
      "remotePolicy",
      "sector",
      "specialty",
      "educationLevel",
      "publishedAtTs",
      "firstSeenAtTs",
      "status",
      "companySlug",
      "sourceSite",
      "countryCode",
      "_geo",
      "universe",
      "jobFamily",
      "experienceLevel",
      "salaryMin",
      "salaryMax",
      "salaryPeriod",
      "publicationKnown",
      "verifiedAtTs",
      "locationPrecise",
      "tags",
    ],
    sortableAttributes: ["publishedAtTs", "verifiedAtTs", "firstSeenAtTs"],
    synonyms: {
      asv: ["auxiliaire vétérinaire", "auxiliaire spécialisé vétérinaire", "veterinary nurse", "assistant vétérinaire"],
      avq: ["auxiliaire vétérinaire qualifié", "asv"],
      "auxiliaire vétérinaire": ["asv", "assistant vétérinaire", "assistante vétérinaire"],
      "soigneur animalier": ["agent animalier", "animalier", "soigneur"],
      refuge: ["spa", "protection animale"],
      spa: ["refuge", "protection animale"],
      "business developer": ["développement commercial", "account executive"],
      vendeur: ["conseiller de vente", "vendeuse"],
      "service client": ["customer care", "relation client"],
      "community manager": ["social media", "réseaux sociaux"],
      "chargé de communication": ["responsable communication", "chargée de communication"],
      "alternance": ["apprentissage", "contrat d'apprentissage"],
    },
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    pagination: { maxTotalHits: 50000 },
  });
  const result = await meili.tasks.waitForTask(task.taskUid, { timeout: 60_000 });
  if (result.status !== "succeeded")
    throw new Error(
      `Configuration de recherche échouée : ${result.error?.message ?? result.status}`,
    );
}

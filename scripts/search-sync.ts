/**
 * Ré-indexation complète Postgres → Meilisearch.
 * Usage : npm run search:sync
 */
import { PrismaClient } from "@prisma/client";
import { configureOffersIndex } from "../src/lib/meilisearch";
import { syncOffersToSearch } from "../src/server/search/sync";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🔎 Configuration de l'index Meilisearch…");
  await configureOffersIndex();

  const offers = await prisma.jobOffer.findMany({ include: { company: true } });
  console.log(`🔎 Indexation de ${offers.length} offres…`);
  await syncOffersToSearch(offers);
  console.log("🔎 Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

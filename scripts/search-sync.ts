/**
 * Ré-indexation complète Postgres → Meilisearch.
 * Usage : npm run search:sync
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";
import { reconcileSearchIndex } from "../src/server/search/reconcile";

async function main(): Promise<void> {
  console.log("Réconciliation PostgreSQL → Meilisearch…");
  console.log(await reconcileSearchIndex());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import "./load-env";
import { prisma } from "../src/lib/prisma";
import { expireStaleOffers } from "../src/server/ingest/freshness";
import { reconcileSearchIndex } from "../src/server/search/reconcile";

async function main(): Promise<void> {
  const expired = await expireStaleOffers();
  const search = await reconcileSearchIndex();
  console.log({ expired, ...search });
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

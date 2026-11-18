import { prisma } from "@/lib/prisma";
import { getMeili, configureOffersIndex, OFFERS_INDEX } from "@/lib/meilisearch";
import { removeOffersFromSearch, syncOffersToSearch } from "./sync";
import { ensureClassification } from "@/server/ingest/reclassify";

type Reconciliation = Promise<{ indexed: number; removed: number }>;
const state = globalThis as typeof globalThis & { joblyReconciliation?: Reconciliation };
export const isSearchRebuilding = () => Boolean(state.joblyReconciliation);

/** Répare aussi les échecs d'indexation d'un cycle précédent. */
export async function reconcileSearchIndex(): Promise<{ indexed: number; removed: number }> {
  if (!state.joblyReconciliation) {
    state.joblyReconciliation = rebuild().finally(() => { state.joblyReconciliation = undefined; });
  }
  return state.joblyReconciliation;
}

async function rebuild() {
  // Le classement d'abord : l'index est reconstruit depuis des offres déjà reclassées.
  await ensureClassification();
  await configureOffersIndex();
  let cursor: string | undefined;
  let indexed = 0;
  for (;;) {
    const offers = await prisma.jobOffer.findMany({
      take: 500,
      orderBy: { id: "asc" },
      include: { company: true },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!offers.length) break;
    await syncOffersToSearch(offers);
    indexed += offers.length;
    cursor = offers.at(-1)!.id;
  }
  // Ne pas décaler les pages pendant la lecture : supprimer après le parcours.
  const orphanIds: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await getMeili()
      .index(OFFERS_INDEX)
      .getDocuments<{ id: string }>({
        fields: ["id"],
        limit: 1000,
        offset,
      });
    if (!page.results.length) break;
    const present = await prisma.jobOffer.findMany({
      where: { id: { in: page.results.map(({ id }) => id) } },
      select: { id: true },
    });
    const ids = new Set(present.map(({ id }) => id));
    orphanIds.push(...page.results.filter(({ id }) => !ids.has(id)).map(({ id }) => id));
  }
  for (let i = 0; i < orphanIds.length; i += 500)
    await removeOffersFromSearch(orphanIds.slice(i, i + 500));
  return { indexed, removed: orphanIds.length };
}

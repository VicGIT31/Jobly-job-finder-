import { prisma } from "@/lib/prisma";
import { syncOffersToSearch } from "@/server/search/sync";
import type { SourceConnector } from "./sources/types";

/** Seul un catalogue employeur complet prouve qu'une annonce a disparu. */
export async function reconcileCatalog(
  connector: SourceConnector,
  startedAt: Date,
  warnings: string[],
): Promise<number> {
  if (!connector.coverage?.complete || warnings.length || !connector.snapshotUrlPrefixes?.length)
    return 0;
  const scope = {
    status: "ACTIVE" as const,
    OR: connector.snapshotUrlPrefixes.map((prefix) => ({ sourceUrl: { startsWith: prefix } })),
  };
  const active = await prisma.jobOffer.count({ where: scope });
  const missing = await prisma.jobOffer.findMany({
    where: { ...scope, lastSeenAt: { lt: startedAt } },
    select: { id: true },
  });
  // Une chute massive est ambiguë (format, facette, maintenance). La fraîcheur
  // normale prend le relais plutôt que de retirer tout un employeur d'un coup.
  if (active >= 20 && missing.length / active > 0.8) {
    warnings.push(
      `Catalogue en forte baisse : ${missing.length}/${active} absentes, retrait immédiat suspendu`,
    );
    return 0;
  }
  if (!missing.length) return 0;
  const ids = missing.map(({ id }) => id);
  const result = await prisma.jobOffer.updateMany({
    where: { id: { in: ids }, lastSeenAt: { lt: startedAt }, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
  await syncOffersToSearch(
    await prisma.jobOffer.findMany({
      where: { id: { in: ids } },
      include: { company: true },
    }),
  );
  return result.count;
}

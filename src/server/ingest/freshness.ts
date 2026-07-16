import { prisma } from "@/lib/prisma";
import { syncOffersToSearch } from "@/server/search/sync";

/**
 * Cron de fraîcheur : toute offre ACTIVE non revue par le scraping depuis
 * OFFER_FRESHNESS_DAYS jours passe en EXPIRED (et l'index est mis à jour).
 */
export async function expireStaleOffers(now = new Date()): Promise<number> {
  const days = Number(process.env.OFFER_FRESHNESS_DAYS ?? 7);
  const threshold = new Date(now.getTime() - days * 86_400_000);

  const stale = await prisma.jobOffer.findMany({
    where: { status: "ACTIVE", lastSeenAt: { lt: threshold } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  const ids = stale.map((o) => o.id);
  await prisma.jobOffer.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED" },
  });

  const updated = await prisma.jobOffer.findMany({
    where: { id: { in: ids } },
    include: { company: true },
  });
  try {
    await syncOffersToSearch(updated);
  } catch (err) {
    console.error("[freshness] Sync Meilisearch échouée :", err);
  }

  return ids.length;
}

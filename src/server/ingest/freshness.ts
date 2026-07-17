import { prisma } from "@/lib/prisma";
import { removeOffersFromSearch, syncOffersToSearch } from "@/server/search/sync";

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

/**
 * Purge des vieilles offres : suppression définitive (base + index) de toute
 * offre publiée il y a plus de OFFER_MAX_AGE_DAYS jours (2 mois par défaut).
 * Les clics et sauvegardes liés sont supprimés en cascade (FK onDelete: Cascade).
 */
export async function purgeOldOffers(now = new Date()): Promise<number> {
  const days = Number(process.env.OFFER_MAX_AGE_DAYS ?? 60);
  const threshold = new Date(now.getTime() - days * 86_400_000);

  const old = await prisma.jobOffer.findMany({
    where: { publishedAt: { lt: threshold } },
    select: { id: true },
  });
  if (old.length === 0) return 0;

  const ids = old.map((o) => o.id);
  await prisma.jobOffer.deleteMany({ where: { id: { in: ids } } });
  try {
    await removeOffersFromSearch(ids);
  } catch (err) {
    console.error("[freshness] Retrait Meilisearch échoué :", err);
  }

  return ids.length;
}

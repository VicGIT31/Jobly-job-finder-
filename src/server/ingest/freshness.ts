import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { removeOffersFromSearch, syncOffersToSearch } from "@/server/search/sync";

/**
 * Durées de vie des offres. Le réglage saisi dans `/admin/parametres` prime ;
 * les variables d'environnement historiques servent de valeur de repli tant
 * qu'aucun réglage n'a été enregistré.
 */
async function lifetimeDays(): Promise<{ freshness: number; maxAge: number }> {
  const settings = await getSettings("ingestion");
  return {
    freshness: settings.freshnessDays || Number(process.env.OFFER_FRESHNESS_DAYS ?? 7),
    maxAge: settings.maxAgeDays || Number(process.env.OFFER_MAX_AGE_DAYS ?? 60),
  };
}

/**
 * Cron de fraîcheur : toute offre ACTIVE non revue par le scraping depuis
 * N jours passe en EXPIRED (et l'index est mis à jour).
 */
export async function expireStaleOffers(now = new Date()): Promise<number> {
  const { freshness: days } = await lifetimeDays();
  const threshold = new Date(now.getTime() - days * 86_400_000);

  const stale = await prisma.jobOffer.findMany({
    where: {
      OR: [{ status: "ACTIVE", lastSeenAt: { lt: threshold } }, { status: { in: ["ACTIVE", "UNCERTAIN"] }, validThrough: { lte: now } }],
    },
    select: { id: true, validThrough: true },
  });
  if (stale.length === 0) return 0;

  let expired = 0;
  const personalUnknown = stale.filter((offer) => !(offer.validThrough && offer.validThrough <= now));
  const uncertainIds = new Set(personalUnknown.map(({ id }) => id));
  const confirmed = stale.filter(({ id }) => !uncertainIds.has(id));
  for (const [group, status] of [[confirmed, "EXPIRED"], [personalUnknown, "UNCERTAIN"]] as const) {
    for (let offset = 0; offset < group.length; offset += 500) {
      const ids = group.slice(offset, offset + 500).map((offer) => offer.id);
      const result = await prisma.jobOffer.updateMany({
        where: { id: { in: ids }, ...(status === "EXPIRED" ? { status: { in: ["ACTIVE", "UNCERTAIN"] }, validThrough: { lte: now } } : { status: "ACTIVE", lastSeenAt: { lt: threshold }, OR: [{ validThrough: null }, { validThrough: { gt: now } }] }) },
        data: { status },
      });
      expired += result.count;
      const updated = await prisma.jobOffer.findMany({ where: { id: { in: ids } }, include: { company: true } });
      try { await syncOffersToSearch(updated); } catch (err) { console.error("[freshness] Sync échouée ; réparation prévue", err); }
    }
  }
  return expired;
}

/**
 * Purge des vieilles offres : suppression définitive (base + index) de toute
 * offre publiée il y a plus de N jours (2 mois par défaut).
 * Les clics et sauvegardes liés sont supprimés en cascade (FK onDelete: Cascade).
 */
export async function purgeOldOffers(now = new Date()): Promise<number> {
  const { maxAge: days } = await lifetimeDays();
  const threshold = new Date(now.getTime() - days * 86_400_000);

  const old = await prisma.jobOffer.findMany({
    where: { publishedAt: { lt: threshold }, savedBy: { none: {} }, hiddenBy: { none: {} }, applications: { none: {} } },
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

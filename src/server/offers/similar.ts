import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import { prisma } from "@/lib/prisma";
import type { OfferWithCompany } from "@/server/search/sync";

/**
 * Offres similaires : même secteur ou même type de contrat, actives,
 * les plus récentes d'abord.
 */
export async function findSimilarOffers(
  offer: { id: string; sector: string; contractType: string; universe?: string; jobFamily?: string },
  take = 6,
): Promise<OfferWithCompany[]> {
  const similar = await prisma.jobOffer.findMany({
    where: {
      id: { not: offer.id },
      ...PUBLIC_OFFER_WHERE,
      ...(offer.universe && offer.universe !== "TECH" ? { universe: offer.universe, ...(offer.jobFamily ? { jobFamily: offer.jobFamily } : {}) } : { universe: "TECH", OR: [{ sector: offer.sector }, { contractType: offer.contractType as never }] }),
    },
    include: { company: true },
    orderBy: [{ lastSeenAt: "desc" }],
    take,
  });
  return similar;
}

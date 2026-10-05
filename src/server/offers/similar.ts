import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import { prisma } from "@/lib/prisma";
import type { OfferWithCompany } from "@/server/search/sync";

/**
 * Offres similaires : même secteur ou même type de contrat, actives,
 * les plus récentes d'abord.
 */
export async function findSimilarOffers(
  offer: { id: string; sector: string; contractType: string },
  take = 6,
): Promise<OfferWithCompany[]> {
  const similar = await prisma.jobOffer.findMany({
    where: {
      id: { not: offer.id },
      ...PUBLIC_OFFER_WHERE,
      OR: [{ sector: offer.sector }, { contractType: offer.contractType as never }],
    },
    include: { company: true },
    orderBy: [{ publishedAt: "desc" }],
    take,
  });
  return similar;
}

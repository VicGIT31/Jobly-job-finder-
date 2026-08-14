import type { Company, JobOffer } from "@prisma/client";
import { getMeili, OFFERS_INDEX } from "@/lib/meilisearch";

export type OfferWithCompany = JobOffer & { company: Company };

export type OfferDocument = {
  id: string;
  title: string;
  slug: string;
  descriptionText: string;
  companyName: string;
  companySlug: string;
  companyLogo: string | null;
  contractType: string;
  city: string;
  countryCode: string;
  remotePolicy: string;
  salaryMin: number | null;
  salaryMax: number | null;
  educationLevel: string;
  sector: string;
  specialty: string;
  sourceSite: string;
  status: string;
  publishedAtTs: number;
  _geo?: { lat: number; lng: number };
};

/** Markdown → texte brut approximatif pour l'index (pas de HTML dans les résultats). */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^- /gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function offerToDocument(offer: OfferWithCompany): OfferDocument {
  return {
    id: offer.id,
    title: offer.title,
    slug: offer.slug,
    descriptionText: stripMarkdown(offer.description).slice(0, 2000),
    companyName: offer.company.name,
    companySlug: offer.company.slug,
    companyLogo: offer.company.logoUrl,
    contractType: offer.contractType,
    city: offer.city,
    countryCode: offer.countryCode,
    remotePolicy: offer.remotePolicy,
    salaryMin: offer.salaryMin,
    salaryMax: offer.salaryMax,
    educationLevel: offer.educationLevel,
    sector: offer.sector,
    specialty: offer.specialty,
    sourceSite: offer.sourceSite,
    status: offer.status,
    publishedAtTs: offer.publishedAt.getTime(),
    ...(offer.latitude != null && offer.longitude != null
      ? { _geo: { lat: offer.latitude, lng: offer.longitude } }
      : {}),
  };
}

/** Indexe (ou met à jour) des offres dans Meilisearch. */
export async function syncOffersToSearch(offers: OfferWithCompany[]): Promise<void> {
  if (offers.length === 0) return;
  const meili = getMeili();
  await meili.index(OFFERS_INDEX).addDocuments(offers.map(offerToDocument), { primaryKey: "id" });
}

/** Supprime des offres de l'index. */
export async function removeOffersFromSearch(offerIds: string[]): Promise<void> {
  if (offerIds.length === 0) return;
  const meili = getMeili();
  await meili.index(OFFERS_INDEX).deleteDocuments(offerIds);
}

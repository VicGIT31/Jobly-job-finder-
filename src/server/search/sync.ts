import type { Company, JobOffer, OfferLocation } from "@prisma/client";
import { getMeili, OFFERS_INDEX } from "@/lib/meilisearch";
import { confirmSearchTask } from "./task";
import { classifyJob } from "@/server/ingest/job-classifier";
import { aiTopics } from "@/server/ingest/ai-topics";
import { offerMissionText } from "@/server/ingest/offer-text";
import { prisma } from "@/lib/prisma";

export type OfferWithCompany = JobOffer & { company: Company; locations?: OfferLocation[] };

export type OfferDocument = {
  id: string;
  title: string;
  slug: string;
  descriptionText: string;
  missionText?: string;
  locations?: Array<{ city: string; countryCode: string; lat?: number; lng?: number }>;
  locationCities?: string[];
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
  universe?: string;
  jobFamily?: string;
  experienceLevel?: string;
  qualificationText?: string | null;
  salaryPeriod?: string;
  publicationKnown?: boolean;
  verifiedAtTs?: number;
  firstSeenAtTs?: number;
  locationPrecise?: boolean;
  remoteKnown?: boolean;
  /** Attributs déduits du texte (débutant accepté, équine, refuge…). */
  tags?: string[];
  /** Confiance du classement métier, 0 à 1, et indices qui l'ont décidé. */
  jobConfidence?: number;
  jobEvidence?: string[];
  /** Pertinence textuelle Meilisearch, 0 à 1 (présente seulement quand elle est demandée). */
  _rankingScore?: number;
  sourceUrl?: string;
  distanceKm?: number | null;
  reasons?: string[];
  score?: number;
  sources?: { sourceSite: string; sourceUrl: string; status?: string }[];
  saved?: boolean;
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
  // Les attributs lisibles viennent du même classifieur que l'ingestion : ils
  // restent cohérents avec le domaine et le métier stockés.
  const insight = classifyJob(offer.title, offer.description, {
    company: offer.company.name,
    sector: offer.sector,
    contract: offer.contractType,
  });
  return {
    id: offer.id,
    title: offer.title,
    slug: offer.slug,
    descriptionText: stripMarkdown(offer.description).slice(0, 16000),
    missionText: offerMissionText(offer.description),
    locations: offer.locations?.map((location) => ({ city: location.city, countryCode: location.countryCode, ...(location.latitude != null && location.longitude != null ? { lat: location.latitude, lng: location.longitude } : {}) })),
    locationCities: [...new Set([offer.city, ...(offer.locations?.map((location) => location.city) ?? [])])],
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
    universe: offer.universe ?? "TECH", jobFamily: offer.jobFamily ?? "OTHER",
    experienceLevel: offer.experienceLevel ?? "UNKNOWN", qualificationText: offer.qualificationText,
    salaryPeriod: offer.salaryPeriod ?? "UNKNOWN", publicationKnown: offer.publicationKnown ?? false,
    verifiedAtTs: offer.lastSeenAt.getTime(), firstSeenAtTs: offer.createdAt?.getTime() ?? offer.scrapedAt.getTime(),
    locationPrecise: offer.locationPrecise ?? false, remoteKnown: offer.remoteKnown ?? false,
    tags: [...new Set([...insight.tags, ...(offer.universe === "TECH" ? aiTopics(offer.title, offer.description) : [])])],
    jobConfidence: insight.confidence,
    jobEvidence: insight.evidence,
    sourceUrl: offer.sourceUrl,
    ...(offer.latitude != null && offer.longitude != null
      ? { _geo: { lat: offer.latitude, lng: offer.longitude } }
      : {}),
  };
}

/** Indexe (ou met à jour) des offres dans Meilisearch. */
export async function syncOffersToSearch(offers: OfferWithCompany[]): Promise<void> {
  if (offers.length === 0) return;
  const meili = getMeili();
  const locations = await prisma.offerLocation.findMany({ where: { offerId: { in: offers.map(({ id }) => id) } } });
  const task = await meili
    .index(OFFERS_INDEX)
    .addDocuments(offers.map((offer) => offerToDocument({ ...offer, locations: locations.filter((location) => location.offerId === offer.id) })), { primaryKey: "id" });
  await confirmSearchTask(task);
}

/** Supprime des offres de l'index. */
export async function removeOffersFromSearch(offerIds: string[]): Promise<void> {
  if (offerIds.length === 0) return;
  const meili = getMeili();
  const task = await meili.index(OFFERS_INDEX).deleteDocuments(offerIds);
  await confirmSearchTask(task);
}

import { parseOfferSearchParams, dateRangeToTimestamp } from "@/lib/search-params";
import { classifyJob, queryFamilies, VOCABULARY, fold } from "@/lib/job-taxonomy";
import { distanceKm } from "@/lib/geo";
import { geocodeCity } from "@/server/ingest/sources/geocode";
import type { JobOffer } from "@prisma/client";
import { normalizeForDedup } from "@/server/ingest/dedup";

/** Paramètres d'une recherche sauvegardée (sérialisés depuis l'URL /offres). */
export type SearchParams = {
  center?: { lat: number; lng: number };
  queryString?: string;
  universe?: string;
  q?: string;
  city?: string;
  contractType?: string[];
  remotePolicy?: string[];
  educationLevel?: string[];
  sector?: string[];
  salaryMin?: number;
};

export type MatchableOffer = Pick<
  JobOffer,
  | "title"
  | "description"
  | "city"
  | "contractType"
  | "remotePolicy"
  | "educationLevel"
  | "sector"
  | "salaryMin"
  | "salaryMax"
> & Partial<Pick<JobOffer, "universe" | "jobFamily" | "latitude" | "longitude" | "experienceLevel" | "qualificationText" | "salaryPeriod" | "publicationKnown" | "publishedAt">> & { companyName?: string };

/**
 * Une offre correspond-elle à une recherche sauvegardée ?
 * Utilisé par le cron d'alertes pour matcher les offres des dernières 24 h.
 */
export function offerMatchesSearch(params: SearchParams, offer: MatchableOffer): boolean {
  if (params.queryString !== undefined) {
    const input = parseOfferSearchParams(Object.fromEntries(new URLSearchParams(params.queryString)));
    if (input.univers !== "TECH") {
      const classification = classifyJob(offer.title);
      if ((offer.universe ?? classification.universe) !== input.univers) return false;
      const families = input.metier ? [input.metier] : queryFamilies(input.q, input.univers);
      if (families.length && !families.includes(offer.jobFamily ?? classification.family)) return false;
      const semantic = Object.values(VOCABULARY).flat().includes(fold(input.q)) || /^(commerce|vente|commercial|sales)$/.test(fold(input.q));
      if (input.q && !semantic) { const text = fold([offer.title, offer.description, offer.companyName].join(" ")); if (!fold(input.q).split(" ").every((word) => text.includes(word))) return false; }
      if (input.national !== "1") {
        const city = input.ville || "Toulouse", center = params.center ?? geocodeCity(city);
        if (center) { if (offer.latitude == null || offer.longitude == null || distanceKm(center, { lat: offer.latitude, lng: offer.longitude }) > (input.rayon ?? 30)) return false; }
        else if (fold(offer.city) !== fold(city)) return false;
      }
      if (input.contrat.length && !input.contrat.includes(offer.contractType as never)) return false;
      if (input.remote.length && !input.remote.includes(offer.remotePolicy)) return false;
      if (input.experience.length && !input.experience.includes((offer.experienceLevel ?? "UNKNOWN") as never)) return false;
      if (input.qualification && offer.qualificationText && !fold(offer.qualificationText).includes(fold(input.qualification))) return false;
      if (input.salaire && offer.salaryPeriod === "YEAR" && (offer.salaryMax ?? offer.salaryMin) != null && (offer.salaryMax ?? offer.salaryMin)! < input.salaire) return false;
      if (input.datePub && (!offer.publicationKnown || !offer.publishedAt || offer.publishedAt.getTime() < dateRangeToTimestamp(input.datePub))) return false;
      return true;
    }
  }
  if (params.q) {
    const haystack = normalizeForDedup(
      [offer.title, offer.description, offer.companyName ?? "", offer.sector, offer.city].join(" "),
    );
    const terms = normalizeForDedup(params.q).split(" ").filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }

  if (params.city && normalizeForDedup(offer.city) !== normalizeForDedup(params.city)) {
    return false;
  }

  if (params.contractType?.length && !params.contractType.includes(offer.contractType)) {
    return false;
  }

  if (params.remotePolicy?.length && !params.remotePolicy.includes(offer.remotePolicy)) {
    return false;
  }

  if (params.educationLevel?.length && !params.educationLevel.includes(offer.educationLevel)) {
    return false;
  }

  if (params.sector?.length && !params.sector.includes(offer.sector)) {
    return false;
  }

  if (params.salaryMin != null) {
    const offerMax = offer.salaryMax ?? offer.salaryMin;
    if (offerMax == null || offerMax < params.salaryMin) return false;
  }

  return true;
}

/** Désérialise le champ JSON `params` d'une SavedSearch de façon défensive. */
export function parseSearchParams(json: unknown): SearchParams {
  if (typeof json !== "object" || json === null) return {};
  const obj = json as Record<string, unknown>;
  const asStringArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  return {
    center: typeof obj.center === "object" && obj.center !== null && "lat" in obj.center && "lng" in obj.center && typeof obj.center.lat === "number" && typeof obj.center.lng === "number" ? { lat: obj.center.lat, lng: obj.center.lng } : undefined,
    queryString: typeof obj.queryString === "string" ? obj.queryString : undefined,
    universe: typeof obj.universe === "string" ? obj.universe : undefined,
    q: typeof obj.q === "string" ? obj.q : undefined,
    city: typeof obj.city === "string" ? obj.city : undefined,
    contractType: asStringArray(obj.contractType),
    remotePolicy: asStringArray(obj.remotePolicy),
    educationLevel: asStringArray(obj.educationLevel),
    sector: asStringArray(obj.sector),
    salaryMin: typeof obj.salaryMin === "number" ? obj.salaryMin : undefined,
  };
}

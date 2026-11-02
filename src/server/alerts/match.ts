import { parseOfferSearchParams, dateRangeToTimestamp, type OfferSearchInput } from "@/lib/search-params";
import { isKnownJobQuery, queryFamilies, fold } from "@/lib/job-taxonomy";
import { distanceKm, type Point } from "@/lib/geo";
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
> & Partial<Pick<JobOffer, "universe" | "jobFamily" | "specialty" | "latitude" | "longitude" | "experienceLevel" | "qualificationText" | "salaryPeriod" | "publicationKnown" | "publishedAt">> & { companyName?: string };

/** Les mêmes critères que la recherche /offres, appliqués à une offre fraîchement ingérée. */
function offerMatchesInput(input: OfferSearchInput, offer: MatchableOffer, center?: Point): boolean {
  const universe = offer.universe ?? "TECH";
  if (input.univers.length && !input.univers.includes(universe as never)) return false;
  const jobFamily = offer.jobFamily ?? "OTHER";
  // Un métier et une spécialité tech s'additionnent (OU) : c'est un seul filtre « Métier ».
  if (input.metier.length || input.specialite.length) {
    const family = input.metier.includes(jobFamily);
    const specialty = !!offer.specialty && input.specialite.includes(offer.specialty as never);
    if (!family && !specialty) return false;
  }
  if (input.q) {
    const families = queryFamilies(input.q);
    if (isKnownJobQuery(input.q) && families.length) {
      if (!families.includes(jobFamily)) return false;
    } else {
      const text = fold([offer.title, offer.description, offer.companyName].join(" "));
      if (!fold(input.q).split(" ").every((word) => text.includes(word))) return false;
    }
  }
  if (input.ville) {
    const origin = center ?? geocodeCity(input.ville);
    if (input.rayon && origin) {
      if (offer.latitude == null || offer.longitude == null) return false;
      if (distanceKm(origin, { lat: offer.latitude, lng: offer.longitude }) > input.rayon) return false;
    } else if (fold(offer.city) !== fold(input.ville)) return false;
  }
  if (input.contrat.length && !input.contrat.includes(offer.contractType as never)) return false;
  if (input.remote.length && !input.remote.includes(offer.remotePolicy)) return false;
  if (input.niveau.length && !input.niveau.includes(offer.educationLevel)) return false;
  if (input.experience.length && !input.experience.includes((offer.experienceLevel ?? "UNKNOWN") as never)) return false;
  if (input.secteur.length && !input.secteur.includes(offer.sector)) return false;
  if (input.qualification && offer.qualificationText && !fold(offer.qualificationText).includes(fold(input.qualification))) return false;
  // Un salaire inconnu n'est pas une incompatibilité : seuls les montants annuels connus sont comparés.
  if (input.salaire && offer.salaryPeriod === "YEAR" && (offer.salaryMax ?? offer.salaryMin) != null && (offer.salaryMax ?? offer.salaryMin)! < input.salaire) return false;
  if (input.datePub && (!offer.publicationKnown || !offer.publishedAt || offer.publishedAt.getTime() < dateRangeToTimestamp(input.datePub))) return false;
  return true;
}

/**
 * Une offre correspond-elle à une recherche sauvegardée ?
 * Utilisé par le cron d'alertes pour matcher les offres des dernières 24 h.
 */
export function offerMatchesSearch(params: SearchParams, offer: MatchableOffer): boolean {
  if (params.queryString !== undefined) {
    const input = parseOfferSearchParams(Object.fromEntries(new URLSearchParams(params.queryString)));
    return offerMatchesInput(input, offer, params.center);
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

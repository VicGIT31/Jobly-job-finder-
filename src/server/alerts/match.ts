import type { JobOffer } from "@prisma/client";
import { normalizeForDedup } from "@/server/ingest/dedup";

/** Paramètres d'une recherche sauvegardée (sérialisés depuis l'URL /offres). */
export type SearchParams = {
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
> & { companyName?: string };

/**
 * Une offre correspond-elle à une recherche sauvegardée ?
 * Utilisé par le cron d'alertes pour matcher les offres des dernières 24 h.
 */
export function offerMatchesSearch(params: SearchParams, offer: MatchableOffer): boolean {
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
    q: typeof obj.q === "string" ? obj.q : undefined,
    city: typeof obj.city === "string" ? obj.city : undefined,
    contractType: asStringArray(obj.contractType),
    remotePolicy: asStringArray(obj.remotePolicy),
    educationLevel: asStringArray(obj.educationLevel),
    sector: asStringArray(obj.sector),
    salaryMin: typeof obj.salaryMin === "number" ? obj.salaryMin : undefined,
  };
}

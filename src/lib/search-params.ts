import { z } from "zod";
import type { ContractType } from "@prisma/client";

/** Contrats exposés au public : Jobly ne référence que stage et alternance. */
export const CONTRACT_TYPES = ["STAGE", "ALTERNANCE"] as const;
export const REMOTE_POLICIES = ["ONSITE", "HYBRID", "FULL"] as const;
export const EDUCATION_LEVELS = [
  "BAC",
  "BAC_2",
  "BAC_3",
  "BAC_5",
  "DOCTORAT",
  "INDIFFERENT",
] as const;
export const DATE_RANGES = ["24h", "7j", "30j"] as const;
export const SORTS = ["pertinence", "date"] as const;
export const RADII = [5, 10, 20, 25, 50, 100] as const;

/**
 * Les 10 plus grandes villes de France (population). Le filtre rapide « Grandes
 * villes » cherche dans un rayon de TOP_CITY_RADIUS_KM autour du centre-ville,
 * pour couvrir l'agglomération (ex. Toulouse inclut Blagnac, Labège, Colomiers).
 */
export const TOP_CITIES = [
  "Paris",
  "Marseille",
  "Lyon",
  "Toulouse",
  "Nice",
  "Nantes",
  "Montpellier",
  "Strasbourg",
  "Bordeaux",
  "Lille",
] as const;
export const TOP_CITY_RADIUS_KM = 20;

export const PAGE_SIZE = 12;

// Couvre tout l'enum Prisma : d'anciennes offres hors périmètre peuvent
// subsister en base (admin) même si seuls stage/alternance sont exposés.
export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  VIE: "VIE",
};

export const REMOTE_LABELS: Record<(typeof REMOTE_POLICIES)[number], string> = {
  ONSITE: "Sur site",
  HYBRID: "Hybride",
  FULL: "Full remote",
};

export const EDUCATION_LABELS: Record<(typeof EDUCATION_LEVELS)[number], string> = {
  BAC: "Bac",
  BAC_2: "Bac +2",
  BAC_3: "Bac +3",
  BAC_5: "Bac +5",
  DOCTORAT: "Doctorat",
  INDIFFERENT: "Indifférent",
};

export const DATE_RANGE_LABELS: Record<(typeof DATE_RANGES)[number], string> = {
  "24h": "Dernières 24 h",
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
};

const csv = <T extends string>(allowed: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((x): x is T => allowed.includes(x as T)) : []));

/** Schéma des query params de /offres — source de vérité partagée serveur/client. */
export const offerSearchParamsSchema = z.object({
  q: z.string().max(200).optional().default(""),
  ville: z.string().max(120).optional().default(""),
  rayon: z.coerce
    .number()
    .optional()
    .transform((v) => (v && (RADII as readonly number[]).includes(v) ? v : undefined)),
  contrat: csv(CONTRACT_TYPES),
  remote: csv(REMOTE_POLICIES),
  niveau: csv(EDUCATION_LEVELS),
  secteur: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean).slice(0, 10) : [])),
  datePub: z.enum(DATE_RANGES).optional(),
  // Tri par date de publication réelle (site d'origine) par défaut.
  tri: z.enum(SORTS).optional().default("date"),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export type OfferSearchInput = z.output<typeof offerSearchParamsSchema>;

/** Parse des searchParams Next.js (Record<string, string | string[] | undefined>). */
export function parseOfferSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): OfferSearchInput {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = offerSearchParamsSchema.safeParse(flat);
  return parsed.success ? parsed.data : offerSearchParamsSchema.parse({});
}

export function dateRangeToTimestamp(
  range: (typeof DATE_RANGES)[number],
  now = Date.now(),
): number {
  const hours = range === "24h" ? 24 : range === "7j" ? 24 * 7 : 24 * 30;
  return now - hours * 3600 * 1000;
}

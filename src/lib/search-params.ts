import { z } from "zod";
import type { ContractType } from "@prisma/client";
import { COLLECTIONS } from "@/lib/company-collections";

/**
 * Contrats exposés au public. Historiquement stage/alternance uniquement
 * (sources françaises) ; les 4 types employeur génériques couvrent les
 * sources internationales ajoutées depuis (voir SOURCES_EUROPE_ASIA.md).
 * CDI/CDD/VIE restent hors filtre public : vocabulaire français legacy,
 * toujours rejeté à l'ingestion pour les sources françaises (normalize.ts).
 */
export const CONTRACT_TYPES = [
  "STAGE",
  "ALTERNANCE",
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "FREELANCE",
] as const;
export const REMOTE_POLICIES = ["ONSITE", "HYBRID", "FULL"] as const;
export const EDUCATION_LEVELS = [
  "BAC",
  "BAC_2",
  "BAC_3",
  "BAC_5",
  "DOCTORAT",
  "INDIFFERENT",
] as const;
/**
 * Spécialités tech (enum Prisma `TechSpecialty`). `AUTRE` n'est pas proposé au
 * filtre : « non classé » n'est pas un critère de recherche pour un candidat,
 * il ne servirait qu'à afficher le fond de tiroir.
 */
export const SPECIALTIES = ["IA", "CYBERSECURITE", "WEB", "DEVOPS", "SOFTWARE", "RESEAUX"] as const;

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

/**
 * Pays des offres indexées (JobOffer.countryCode). "FR" reste le défaut
 * historique (non affiché comme un badge distinctif, voir offer-card.tsx) ;
 * les autres viennent des sources internationales — voir
 * SOURCES_EUROPE_ASIA.md et CONTEXTE_AI_WORK.md §2.7. "XX" = pays non résolu
 * par l'heuristique de localisation des connecteurs ATS.
 */
export const COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  US: "États-Unis",
  GB: "Royaume-Uni",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
  IE: "Irlande",
  PL: "Pologne",
  AT: "Autriche",
  CH: "Suisse",
  SE: "Suède",
  DK: "Danemark",
  NO: "Norvège",
  FI: "Finlande",
  BE: "Belgique",
  PT: "Portugal",
  CZ: "République tchèque",
  SG: "Singapour",
  IN: "Inde",
  JP: "Japon",
  KR: "Corée du Sud",
  AE: "Émirats arabes unis",
  HK: "Hong Kong",
  MY: "Malaisie",
  ID: "Indonésie",
  TH: "Thaïlande",
  VN: "Vietnam",
  PH: "Philippines",
  TW: "Taïwan",
  CA: "Canada",
  AU: "Australie",
  XX: "Autre / non précisé",
};
export const COUNTRIES = Object.keys(COUNTRY_LABELS);

/**
 * Pays européens mis en avant sur l'accueil (§"focus Europe et France").
 * Sous-ensemble de COUNTRY_LABELS : une mise en avant éditoriale, pas une
 * restriction technique — le filtre `/offres?pays=` reste ouvert à tous les
 * pays indexés (voir SOURCES_EUROPE_ASIA.md pour le reste, notamment Asie).
 */
export const EUROPEAN_COUNTRIES = [
  "FR",
  "GB",
  "DE",
  "ES",
  "IT",
  "NL",
  "IE",
  "SE",
  "PL",
  "AT",
  "CH",
  "BE",
  "PT",
  "DK",
  "NO",
  "FI",
  "CZ",
];

// Couvre tout l'enum Prisma : d'anciennes offres hors périmètre peuvent
// subsister en base (admin) même si seuls stage/alternance sont exposés.
export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  VIE: "VIE",
  // Sources internationales (SOURCES_EUROPE_ASIA.md) — hors périmètre
  // stage/alternance strict des sources françaises.
  FULL_TIME: "Temps plein",
  PART_TIME: "Temps partiel",
  CONTRACT: "Contrat",
  FREELANCE: "Freelance",
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

export const SPECIALTY_LABELS: Record<(typeof SPECIALTIES)[number], string> = {
  IA: "IA & Data",
  CYBERSECURITE: "Cybersécurité",
  WEB: "Web",
  DEVOPS: "DevOps & Cloud",
  SOFTWARE: "Software Engineering",
  RESEAUX: "Réseaux & Systèmes",
};

/** Pictogrammes des spécialités, utilisés sur l'accueil et les puces de filtre. */
export const SPECIALTY_ICONS: Record<(typeof SPECIALTIES)[number], string> = {
  IA: "🧠",
  CYBERSECURITE: "🛡️",
  WEB: "🌐",
  DEVOPS: "⚙️",
  SOFTWARE: "💻",
  RESEAUX: "🖧",
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

/** Clés de collection valides pour le filtre `categorie` — dérivées de `COLLECTIONS`. */
export const COLLECTION_KEYS = COLLECTIONS.map((c) => c.key);
export const COLLECTION_LABELS: Record<string, string> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c.label]),
);
export const COLLECTION_ICONS: Record<string, string> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c.icon]),
);

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
  specialite: csv(SPECIALTIES),
  pays: csv(COUNTRIES),
  categorie: csv(COLLECTION_KEYS),
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

/**
 * Drapeaux des pays couverts par les sources internationales (Europe/Asie —
 * voir SOURCES_EUROPE_ASIA.md). "FR" n'y figure pas : c'est le défaut
 * historique, jamais affiché comme un badge distinctif sur les cartes.
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  ES: "🇪🇸",
  IT: "🇮🇹",
  NL: "🇳🇱",
  IE: "🇮🇪",
  PL: "🇵🇱",
  AT: "🇦🇹",
  CH: "🇨🇭",
  SE: "🇸🇪",
  DK: "🇩🇰",
  NO: "🇳🇴",
  FI: "🇫🇮",
  BE: "🇧🇪",
  PT: "🇵🇹",
  CZ: "🇨🇿",
  SG: "🇸🇬",
  IN: "🇮🇳",
  JP: "🇯🇵",
  KR: "🇰🇷",
  AE: "🇦🇪",
  HK: "🇭🇰",
  MY: "🇲🇾",
  ID: "🇮🇩",
  TH: "🇹🇭",
  VN: "🇻🇳",
  PH: "🇵🇭",
  TW: "🇹🇼",
  CA: "🇨🇦",
  AU: "🇦🇺",
  XX: "🌍",
};

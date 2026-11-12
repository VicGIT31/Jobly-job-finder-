import { z } from "zod";
import type { ContractType } from "@prisma/client";
import { COLLECTIONS } from "@/lib/company-collections";
import { FAMILY_LABELS, TAG_LABELS, UNIVERSES } from "@/lib/job-taxonomy";

/**
 * Contrats de toute l'application : stages et alternances pour la tech, tous
 * les contrats pour le commerce, le marketing, la communication et l'ASV.
 */
export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "INTERIM",
  "STAGE",
  "ALTERNANCE",
  "PART_TIME",
  "FULL_TIME",
  "FREELANCE",
  "CONTRACT",
  "UNKNOWN",
] as const;
export const REMOTE_POLICIES = ["ONSITE", "HYBRID", "FULL", "UNKNOWN"] as const;
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

export const DATE_RANGES = ["24h", "5j", "7j", "30j"] as const;
export const SORTS = ["pertinence", "date"] as const;
export const RADII = [5, 10, 20, 25, 30, 50, 100] as const;

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
 * les autres sont conservés pour les données internationales historiques.
 * "XX" = pays non résolu. Le périmètre de collecte courant est décrit dans
 * docs/v0.5.0/COLLECTE.md.
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
 * Sous-ensemble européen de COUNTRY_LABELS conservé pour les consultations
 * historiques. Cette liste ne définit pas le périmètre de collecte courant.
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
// subsister en base. Les contrats exposés dépendent des règles du métier.
export const CONTRACT_LABELS: Record<ContractType, string> = {
  UNKNOWN: "Contrat non précisé",
  INTERIM: "Intérim",
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  VIE: "VIE",
  // Contrats génériques et historiques ; le périmètre est vérifié par métier.
  FULL_TIME: "Temps plein",
  PART_TIME: "Temps partiel",
  CONTRACT: "Contrat",
  FREELANCE: "Freelance",
};

export const REMOTE_LABELS: Record<(typeof REMOTE_POLICIES)[number], string> = {
  UNKNOWN: "Télétravail non précisé",
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
  "5j": "5 derniers jours",
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

/** Familles de métiers filtrables (hors « Autre »), dérivées des libellés. */
export const FAMILY_KEYS = Object.keys(FAMILY_LABELS).filter((key) => key !== "OTHER");
export const TAG_KEYS = Object.keys(TAG_LABELS);
export const EXPERIENCE_KEYS = ["JUNIOR", "CONFIRMED", "SENIOR", "UNKNOWN"] as const;

/** Schéma des query params de /offres — source de vérité partagée serveur/client. */
export const offerSearchParamsSchema = z.object({
  // Domaines : vide = tous les métiers mélangés (tech, commerce, communication, ASV).
  univers: csv(UNIVERSES),
  metier: csv(FAMILY_KEYS),
  experience: csv(EXPERIENCE_KEYS),
  tag: csv(TAG_KEYS),
  qualification: z.string().max(80).optional().default(""),
  salaire: z.coerce.number().min(0).max(500000).optional(),
  // Ancien mode « Toute la France » : sans ville, la recherche est déjà nationale.
  national: z.enum(["0", "1"]).optional().default("0"),
  incertaines: z.enum(["0", "1"]).optional().default("0"),
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
  // Absent : pertinence quand une recherche textuelle ou une ville est donnée, sinon récentes.
  tri: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(5000).optional().default(1),
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

/** Tri effectif : la pertinence n'a de sens que s'il y a quelque chose à comparer. */
export function resolveSort(
  input: Pick<OfferSearchInput, "tri" | "q" | "ville">,
): (typeof SORTS)[number] {
  return input.tri ?? (input.q || input.ville ? "pertinence" : "date");
}

export function dateRangeToTimestamp(
  range: (typeof DATE_RANGES)[number],
  now = Date.now(),
): number {
  const hours = range === "24h" ? 24 : range === "5j" ? 24 * 5 : range === "7j" ? 24 * 7 : 24 * 30;
  return now - hours * 3600 * 1000;
}

/**
 * Drapeaux des pays des offres internationales historiques.
 * "FR" n'y figure pas : c'est le défaut
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

import { z } from "zod";
import type { ContractType, EducationLevel, RemotePolicy } from "@prisma/client";

/** Offre brute telle que reçue du scraper (champs volontairement souples). */
export const rawOfferSchema = z.object({
  title: z.string().min(3).max(200),
  companyName: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  description: z.string().min(20),
  contractType: z.string(),
  remotePolicy: z.string().optional(),
  educationLevel: z.string().optional(),
  sector: z.string().min(1).max(120),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  sourceUrl: z.string().url(),
  // Attribution par offre : un connecteur agrégateur (JSearch) peut remonter des
  // offres de plusieurs sites (Indeed, Glassdoor…) → chacune garde sa vraie source.
  sourceSite: z.string().min(3).max(120).optional(),
  scrapedAt: z.coerce.date().optional(),
  // Date de publication réelle de l'annonce sur le site d'origine (pas la date
  // d'ingestion). Absente si la source ne l'expose pas.
  publishedAt: z.coerce.date().optional(),
  // Logo de l'entreprise tel qu'exposé par la source.
  companyLogoUrl: z.string().url().max(1000).optional(),
  // ISO 3166-1 alpha-2. Absent = source française historique ("FR").
  countryCode: z.string().length(2).optional(),
});

export type RawOffer = z.infer<typeof rawOfferSchema>;

export const ingestPayloadSchema = z.object({
  sourceSite: z.string().min(3).max(120),
  offers: z.array(z.unknown()).min(1).max(500),
});

export type NormalizedOffer = {
  title: string;
  companyName: string;
  city: string;
  description: string;
  contractType: ContractType;
  remotePolicy: RemotePolicy;
  educationLevel: EducationLevel;
  sector: string;
  salaryMin: number | null;
  salaryMax: number | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
  sourceSite: string | null;
  scrapedAt: Date;
  publishedAt: Date | null;
  companyLogoUrl: string | null;
  countryCode: string;
};

const CONTRACT_MAP: Record<string, ContractType> = {
  cdi: "CDI",
  "full-time": "CDI",
  fulltime: "CDI",
  permanent: "CDI",
  cdd: "CDD",
  "fixed-term": "CDD",
  interim: "CDD",
  stage: "STAGE",
  internship: "STAGE",
  intern: "STAGE",
  alternance: "ALTERNANCE",
  apprentissage: "ALTERNANCE",
  apprenticeship: "ALTERNANCE",
  "contrat pro": "ALTERNANCE",
  vie: "VIE",
  "volontariat international": "VIE",
  // Clés dédiées aux connecteurs internationaux (sources/arbetsformedlingen.ts,
  // sources/ats-boards.ts…) : volontairement distinctes des clés françaises
  // ci-dessus pour ne jamais changer le classement d'une source existante.
  employment_full_time: "FULL_TIME",
  employment_part_time: "PART_TIME",
  employment_contract: "CONTRACT",
  employment_freelance: "FREELANCE",
  employment_internship: "STAGE",
  employment_apprenticeship: "ALTERNANCE",
};

/**
 * Jobly ne référence que les stages et alternances **pour ses sources
 * françaises historiques**. Les autres contrats (CDI, CDD, VIE…) sont
 * reconnus par CONTRACT_MAP mais rejetés à l'ingestion par défaut, pour
 * distinguer « hors périmètre » de « vocabulaire inconnu » dans les logs.
 *
 * Les connecteurs internationaux (spec §2, §54 : full-time, part-time,
 * contract, freelance en plus des stages/alternances) passent leur propre
 * `acceptedContracts` à `normalizeOffer`/`processIngest` — le défaut ci-dessous
 * ne change pas pour les 7 connecteurs existants.
 */
const DEFAULT_ACCEPTED_CONTRACTS: ReadonlySet<ContractType> = new Set(["STAGE", "ALTERNANCE"]);

const REMOTE_MAP: Record<string, RemotePolicy> = {
  onsite: "ONSITE",
  "sur site": "ONSITE",
  présentiel: "ONSITE",
  presentiel: "ONSITE",
  hybrid: "HYBRID",
  hybride: "HYBRID",
  "télétravail partiel": "HYBRID",
  full: "FULL",
  "full remote": "FULL",
  remote: "FULL",
  "télétravail total": "FULL",
};

const EDUCATION_MAP: Record<string, EducationLevel> = {
  bac: "BAC",
  "bac+2": "BAC_2",
  "bac +2": "BAC_2",
  bts: "BAC_2",
  dut: "BAC_2",
  "bac+3": "BAC_3",
  "bac +3": "BAC_3",
  licence: "BAC_3",
  bachelor: "BAC_3",
  "bac+5": "BAC_5",
  "bac +5": "BAC_5",
  master: "BAC_5",
  ingénieur: "BAC_5",
  ingenieur: "BAC_5",
  doctorat: "DOCTORAT",
  phd: "DOCTORAT",
  indifférent: "INDIFFERENT",
  indifferent: "INDIFFERENT",
};

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** "  paris " → "Paris" ; "SAINT-ÉTIENNE" → "Saint-Étienne" */
function normalizeCity(raw: string): string {
  const cleaned = cleanWhitespace(raw).toLowerCase();
  return cleaned
    .split(/([\s-])/)
    .map((part) =>
      part === " " || part === "-" ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

export class NormalizationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "NormalizationError";
  }
}

export type NormalizeOptions = {
  /** Périmètre de contrats accepté par la source appelante. Défaut : stage/alternance uniquement. */
  acceptedContracts?: ReadonlySet<ContractType>;
};

/**
 * Normalise une offre brute validée en offre prête à insérer.
 * Lève NormalizationError si un champ énuméré est inconnu.
 */
export function normalizeOffer(raw: RawOffer, options: NormalizeOptions = {}): NormalizedOffer {
  const acceptedContracts = options.acceptedContracts ?? DEFAULT_ACCEPTED_CONTRACTS;

  const contractKey = cleanWhitespace(raw.contractType).toLowerCase();
  const contractType = CONTRACT_MAP[contractKey];
  if (!contractType) {
    throw new NormalizationError(`Type de contrat inconnu : "${raw.contractType}"`, "contractType");
  }
  if (!acceptedContracts.has(contractType)) {
    throw new NormalizationError(`Contrat hors périmètre : "${raw.contractType}"`, "contractType");
  }

  const remoteKey = cleanWhitespace(raw.remotePolicy ?? "onsite").toLowerCase();
  const remotePolicy = REMOTE_MAP[remoteKey];
  if (!remotePolicy) {
    throw new NormalizationError(
      `Politique remote inconnue : "${raw.remotePolicy}"`,
      "remotePolicy",
    );
  }

  const educationKey = cleanWhitespace(raw.educationLevel ?? "indifférent").toLowerCase();
  const educationLevel = EDUCATION_MAP[educationKey];
  if (!educationLevel) {
    throw new NormalizationError(
      `Niveau d'études inconnu : "${raw.educationLevel}"`,
      "educationLevel",
    );
  }

  if (raw.salaryMin != null && raw.salaryMax != null && raw.salaryMin > raw.salaryMax) {
    throw new NormalizationError("salaryMin > salaryMax", "salaryMin");
  }

  return {
    title: cleanWhitespace(raw.title),
    companyName: cleanWhitespace(raw.companyName),
    city: normalizeCity(raw.city),
    description: raw.description.trim(),
    contractType,
    remotePolicy,
    educationLevel,
    sector: cleanWhitespace(raw.sector),
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    sourceUrl: raw.sourceUrl,
    sourceSite: raw.sourceSite ?? null,
    scrapedAt: raw.scrapedAt ?? new Date(),
    publishedAt: raw.publishedAt ?? null,
    companyLogoUrl: raw.companyLogoUrl ?? null,
    countryCode: (raw.countryCode ?? "FR").toUpperCase(),
  };
}

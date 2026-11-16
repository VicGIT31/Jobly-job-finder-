import type { ContractType } from "@prisma/client";
import { experienceFrom, qualificationFrom, fold } from "@/lib/job-taxonomy";
import { classifyJob, isInScope } from "./job-classifier";
import { geocodeCityFull } from "./sources/geocode";
import { TECH_SECTOR } from "./sources/types";
import { inferEducationLevel } from "./enrich";
import { htmlToText } from "./html-to-text";
import type { RawOffer } from "./normalize";

/** Contrats acceptés par les sources « emploi » : tous, la règle tech s'applique à l'ingestion. */
export const PERSONAL_CONTRACTS = new Set<ContractType>([
  "CDI",
  "CDD",
  "INTERIM",
  "STAGE",
  "ALTERNANCE",
  "VIE",
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "FREELANCE",
  "UNKNOWN",
]);

const CONTRACT_PATTERNS: Array<[key: string, pattern: RegExp]> = [
  ["alternance", /\b(alternance|apprentissage|apprenti|apprenticeship)\b/],
  ["stage", /\b(stage|internship|intern)\b/],
  ["cdd", /\b(cdd|fixed term|temporary)\b/],
  ["interim", /\b(interim)\b/],
  ["cdi", /\b(cdi|permanent)\b/],
  ["employment_freelance", /\b(freelance|independant|non salarie|franchise)\b/],
];
const CONTRACT_IN_BODY =
  /(?:contrat|poste|emploi) (?:en |de |est un |a pourvoir en )?(?:cdi|cdd|interim|alternance|stage)|recrut[a-z ]{0,100} en (?:cdi|cdd|interim|alternance|stage)/;

const contractFrom = (text: string) =>
  CONTRACT_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

/** Le titre et le contrat structuré priment sur le vocabulaire du reste de l'annonce. */
export function personalContract(title: string, structured = "", description = ""): string {
  const raw = fold(structured.replace(/([a-z])([A-Z])/g, "$1 $2"));
  // HelloWork emploie INTERN pour stage ET alternance. Une mention explicite
  // de contrat d'apprentissage tranche, sans prendre « expérience en stage » pour un contrat.
  const genericIntern = /^(intern|internship|employment internship)$/.test(raw);
  const apprenticeship = genericIntern && /\bcontrat (?:d apprentissage|de professionnalisation)\b/.test(fold(description).slice(0, 2500));
  return (
    contractFrom(fold(title)) ??
    (apprenticeship ? "alternance" : contractFrom(raw)) ??
    contractFrom(fold(description).match(CONTRACT_IN_BODY)?.[0] ?? "") ??
    (raw === "full time"
      ? "employment_full_time"
      : raw === "part time"
        ? "employment_part_time"
        : "unknown")
  );
}

export type PersonalOfferInput = {
  title: string;
  company: string;
  description: string;
  city?: string;
  country?: string;
  url: string;
  contract?: string;
  publishedAt?: string;
  validThrough?: string;
  lat?: number;
  lng?: number;
  remote?: string;
  logo?: string;
  salaryMin?: number;
  salaryMax?: number;
  sector?: string;
  salaryPeriod?: "YEAR" | "MONTH" | "HOUR" | "UNKNOWN";
};

const SECTORS = {
  ASV: "Santé animale",
  COMMERCE: "Commerce / Marketing",
  TECH: TECH_SECTOR,
  FINANCE: "Assurance / Banque / Finance",
  HOSPITALITY: "Café / Restauration",
} as const;

function remoteFrom(context: string): string {
  if (/teletravail (?:total|complet)|full remote|100 remote/.test(context)) return "remote";
  if (/hybride|hybrid|teletravail partiel|jours? de teletravail/.test(context)) return "hybrid";
  if (/sur site|presentiel/.test(context)) return "onsite";
  return "unknown";
}

const roundCents = (value: number) => Math.round(value * 100) / 100;

/**
 * Construit une offre brute à partir d'une page ou d'un flux public. Renvoie
 * `null` hors périmètre (métier non suivi, hors France) : la géolocalisation,
 * réseau compris, n'est tentée qu'après le classement.
 */
export async function makePersonalOffer(input: PersonalOfferInput, { national = false } = {}): Promise<RawOffer | null> {
  const description = htmlToText(input.description);
  if ((input.country && !/^(fr|france)$/i.test(input.country)) || description.length < 20)
    return null;
  const contractKey = personalContract(input.title, input.contract, description);
  const classification = classifyJob(input.title, description, {
    company: input.company,
    contract: contractKey.toUpperCase(),
  });
  if (!national && !isInScope(classification, contractKey.toUpperCase()).ok) return null;

  const city = (input.city ?? "Localisation non précisée").replace(/\s*\(\d{2,5}\)\s*$/, "").trim();
  const geo =
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
      ? { lat: input.lat, lng: input.lng }
      : await geocodeCityFull(city);
  if (!national && !isInScope(classification, contractKey.toUpperCase(), { city, latitude: geo?.lat, longitude: geo?.lng }).ok) return null;
  const dates: { publishedAt?: Date; validThrough?: Date } = {};
  for (const field of ["publishedAt", "validThrough"] as const) {
    const value = input[field];
    if (value && Number.isFinite(Date.parse(value))) dates[field] = new Date(value);
  }
  const remote = input.remote ?? remoteFrom(fold(`${input.title} ${description}`));
  const salaryMin =
    input.salaryMin && input.salaryMin > 0 ? roundCents(input.salaryMin) : undefined;
  const salaryMax =
    input.salaryMax && input.salaryMax > 0 ? roundCents(input.salaryMax) : undefined;

  return {
    title: input.title.trim().slice(0, 200),
    companyName: input.company.trim().slice(0, 120),
    description,
    city: city.slice(0, 120),
    countryCode: "FR",
    sector: input.sector ?? SECTORS[classification.universe as keyof typeof SECTORS] ?? "Non renseigné",
    contractType: contractKey,
    remotePolicy: remote,
    educationLevel: inferEducationLevel(input.title, description),
    sourceUrl: input.url,
    scrapedAt: new Date(),
    ...dates,
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
    locationPrecise: !!geo,
    experienceLevel: experienceFrom(input.title, description),
    qualificationText: qualificationFrom(description) ?? undefined,
    ...(input.logo?.startsWith("https://") ? { companyLogoUrl: input.logo } : {}),
    ...(salaryMin ? { salaryMin } : {}),
    ...(salaryMax ? { salaryMax } : {}),
    salaryPeriod: input.salaryPeriod ?? "UNKNOWN",
  };
}

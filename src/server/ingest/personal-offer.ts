import { classifyJob, experienceFrom, qualificationFrom, fold } from "@/lib/job-taxonomy";
import { geocodeCityFull } from "./sources/geocode";
import { htmlToText } from "./html-to-text";
import type { RawOffer } from "./normalize";

export const PERSONAL_CONTRACTS = new Set<import("@prisma/client").ContractType>(["CDI", "CDD", "INTERIM", "STAGE", "ALTERNANCE", "VIE", "FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "UNKNOWN"]);
export function personalContract(title: string, structured = "", description = ""): string {
  const heading = fold(title), raw = fold(structured);
  const match = (text: string) => /\b(alternance|apprentissage|apprenti|apprenticeship)\b/.test(text) ? "alternance" : /\b(stage|internship|intern)\b/.test(text) ? "stage" : /\b(cdd|fixed term|temporary)\b/.test(text) ? "cdd" : /\b(interim)\b/.test(text) ? "interim" : /\b(cdi|permanent)\b/.test(text) ? "cdi" : /\b(freelance|independant)\b/.test(text) ? "employment_freelance" : null;
  return match(heading) ?? match(raw) ?? match(fold(description).match(/(?:contrat|poste|emploi) (?:en |de |est un |a pourvoir en )?(?:cdi|cdd|interim|alternance|stage)/)?.[0] ?? "") ?? (raw === "full time" ? "employment_full_time" : raw === "part time" ? "employment_part_time" : "unknown");
}
export type PersonalOfferInput = {
  title: string; company: string; description: string; city?: string; country?: string; url: string;
  contract?: string; publishedAt?: string; validThrough?: string; lat?: number; lng?: number;
  remote?: string; logo?: string; salaryMin?: number; salaryMax?: number; salaryPeriod?: "YEAR" | "MONTH" | "HOUR" | "UNKNOWN";
};
export async function makePersonalOffer(input: PersonalOfferInput): Promise<RawOffer | null> {
  const description = htmlToText(input.description);
  const classification = classifyJob(input.title, description);
  if (!["COMMERCE", "ASV"].includes(classification.universe) || (input.country && !/^(fr|france)$/i.test(input.country)) || description.length < 20) return null;
  const city = (input.city ?? "Localisation non précisée").replace(/\s*\(\d{2,5}\)\s*$/, "").trim();
  const geo = input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng) ? { lat: input.lat, lng: input.lng } : await geocodeCityFull(city);
  const dates: { publishedAt?: Date; validThrough?: Date } = {};
  for (const field of ["publishedAt", "validThrough"] as const) if (input[field] && Number.isFinite(Date.parse(input[field]!))) dates[field] = new Date(input[field]!);
  const context = fold(input.title + " " + description);
  const remote = input.remote ?? (/teletravail (?:total|complet)|full remote|100 remote/.test(context) ? "remote" : /hybride|hybrid|teletravail partiel|jours? de teletravail/.test(context) ? "hybrid" : /sur site|presentiel/.test(context) ? "onsite" : "unknown");
  return { title: input.title.trim().slice(0, 200), companyName: input.company.trim().slice(0, 120), description, city: city.slice(0, 120), countryCode: "FR", sector: classification.universe === "ASV" ? "Santé animale" : "Commerce / Marketing", contractType: personalContract(input.title, input.contract, description), remotePolicy: remote, educationLevel: "indifférent", sourceUrl: input.url, scrapedAt: new Date(), ...dates, ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}), locationPrecise: !!geo, experienceLevel: experienceFrom(input.title, description), qualificationText: qualificationFrom(description) ?? undefined, ...(input.logo?.startsWith("https://") ? { companyLogoUrl: input.logo } : {}), ...(input.salaryMin && input.salaryMin > 0 ? { salaryMin: Math.round(input.salaryMin) } : {}), ...(input.salaryMax && input.salaryMax > 0 ? { salaryMax: Math.round(input.salaryMax) } : {}), salaryPeriod: input.salaryPeriod ?? "UNKNOWN" };
}

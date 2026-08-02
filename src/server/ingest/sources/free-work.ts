import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel } from "@/server/ingest/enrich";
import { RateLimitedError, fetchJson } from "@/server/ingest/http";
import { geocodeCityFull } from "./geocode";
import { TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur Free-Work (ex Freelance-Info) — API publique API Platform
 * (`/api/job_postings`, format Hydra). Aucune clé requise.
 *
 * Volume modeste (quelques dizaines de stages/alternances) mais **100 % tech et
 * majoritairement français**, avec des métadonnées que les autres sources
 * n'exposent pas : mode de télétravail structuré, compétences, salaire annuel.
 * On lit ces champs plutôt que de les deviner du texte.
 */

const API = "https://www.free-work.com/api/job_postings";
const OFFER_URL = "https://www.free-work.com/fr/tech-it";

/** Contrats Free-Work correspondant au périmètre de Jobly. */
const CONTRACTS: Array<{ api: string; contractType: string }> = [
  { api: "internship", contractType: "stage" },
  { api: "apprenticeship", contractType: "alternance" },
];

const PAGE_SIZE = 50;
const MAX_PAGES = 3;

type FreeWorkLocation = {
  country?: string;
  countryCode?: string;
  shortLabel?: string;
  label?: string;
  latitude?: string;
  longitude?: string;
};

type FreeWorkJob = {
  id?: number;
  title?: string;
  slug?: string;
  description?: string;
  company?: { name?: string; logo?: { url?: string } };
  location?: FreeWorkLocation;
  /** "full" | "partial" | "none" selon l'annonce. */
  remoteMode?: string;
  publishedAt?: string;
  applicationUrl?: string;
  minAnnualSalary?: number;
  maxAnnualSalary?: number;
  skills?: Array<{ name?: string }>;
};

/**
 * Free-Work tourne sur API Platform : la forme de la réponse dépend de
 * l'en-tête `Accept`. En `application/ld+json` on reçoit l'enveloppe Hydra, en
 * `application/json` un simple tableau. On accepte les deux plutôt que de
 * dépendre d'une négociation de contenu qui peut changer.
 */
type FreeWorkResponse = { "hydra:member"?: FreeWorkJob[] } | FreeWorkJob[];

function responseMembers(json: FreeWorkResponse | null): FreeWorkJob[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  return json["hydra:member"] ?? [];
}

/** Mode de télétravail structuré → vocabulaire attendu par `normalize.ts`. */
const REMOTE_MODES: Record<string, string> = {
  full: "remote",
  partial: "hybride",
  none: "onsite",
};

function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function toRawOffer(job: FreeWorkJob, contractType: string): Promise<RawOffer | null> {
  const title = job.title?.trim();
  const company = job.company?.name?.trim();
  const slug = job.slug?.trim();
  const location = job.location;
  if (!title || !company || !slug || !location) return null;

  // Périmètre France uniquement : l'API mélange les annonces UK.
  if ((location.countryCode ?? "").toUpperCase() !== "FR") return null;

  const city = (location.shortLabel ?? location.label ?? "").split(",")[0].trim();
  if (!city) return null;

  const description = htmlToText(job.description ?? "");
  if (description.length < 20) return null;

  // Les compétences listées enrichissent le texte indexé pour la recherche.
  const skills = (job.skills ?? []).map((s) => s.name).filter(Boolean);
  const fullDescription = skills.length
    ? `${description}\n\nCompétences : ${skills.join(", ")}`
    : description;

  const lat = location.latitude != null ? Number(location.latitude) : NaN;
  const lng = location.longitude != null ? Number(location.longitude) : NaN;
  const geo =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : await geocodeCityFull(city);

  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: fullDescription.slice(0, 8000),
    contractType,
    // Champ structuré côté source : plus fiable que la déduction textuelle.
    remotePolicy: REMOTE_MODES[job.remoteMode ?? ""] ?? "onsite",
    educationLevel: inferEducationLevel(title, description),
    sector: TECH_SECTOR,
    sourceUrl: `${OFFER_URL}/${slug}`,
    scrapedAt: new Date(),
    ...(job.publishedAt ? { publishedAt: new Date(job.publishedAt) } : {}),
    ...(job.minAnnualSalary ? { salaryMin: Math.round(job.minAnnualSalary) } : {}),
    ...(job.maxAnnualSalary ? { salaryMax: Math.round(job.maxAnnualSalary) } : {}),
    ...(job.company?.logo?.url?.startsWith("http") ? { companyLogoUrl: job.company.logo.url } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class FreeWorkConnector implements SourceConnector {
  readonly sourceSite = "free-work.com";
  readonly label = "Free-Work";

  isEnabled(): boolean {
    return true; // API publique : aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const offers: RawOffer[] = [];

    for (const contract of CONTRACTS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = new URL(API);
        url.searchParams.set("contracts", contract.api);
        url.searchParams.set("itemsPerPage", String(PAGE_SIZE));
        url.searchParams.set("page", String(page));

        let json: FreeWorkResponse | null;
        try {
          json = await fetchJson<FreeWorkResponse>(url, { timeoutMs: 20_000 });
        } catch (err) {
          if (err instanceof RateLimitedError) return offers;
          throw err;
        }
        const members = responseMembers(json);
        if (members.length === 0) break;

        for (const job of members) {
          const mapped = await toRawOffer(job, contract.contractType);
          if (mapped) offers.push(mapped);
        }

        if (members.length < PAGE_SIZE) break;
      }
    }

    return offers;
  }
}

import type { ContractType } from "@prisma/client";
import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchJson } from "@/server/ingest/http";
import { TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur Arbetsförmedlingen (Suède) — API officielle JobTech, gratuite,
 * sans clé, sans authentification. Voir SOURCES_EUROPE_ASIA.md §2 : c'est le
 * meilleur rapport effort/couverture pour la première source réellement
 * internationale de Jobly. Testé en conditions réelles le 2026-08-14
 * (`https://jobsearch.api.jobtechdev.se/search`).
 *
 * Contrairement aux connecteurs français, cette source n'est pas limitée
 * à stage/alternance : `acceptedContracts` couvre l'ensemble des types
 * d'emploi listés au §54 du cahier des charges (full-time, part-time,
 * contract, internship, apprenticeship). Le filtre stage/alternance strict
 * (`normalize.ts`) reste inchangé pour les autres connecteurs.
 */

const API = "https://jobsearch.api.jobtechdev.se/search";
const QUERIES = [
  "developer",
  "software engineer",
  "data engineer",
  "devops",
  "frontend",
  "backend",
];
const RESULTS_PER_QUERY = 20;

type JobTechHit = {
  id: string;
  headline?: string;
  webpage_url?: string;
  logo_url?: string | null;
  description?: { text?: string };
  employer?: { name?: string };
  employment_type?: { label?: string };
  duration?: { label?: string };
  working_hours_type?: { label?: string };
  occupation_field?: { label?: string };
  workplace_address?: {
    city?: string | null;
    municipality?: string | null;
    coordinates?: [number, number]; // [lng, lat]
  };
  publication_date?: string;
};

type JobTechResponse = { hits?: JobTechHit[] };

function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Type d'emploi générique déduit de `duration` + `working_hours_type`.
 * Vocabulaire suédois officiel (taxonomie JobTech) : « Tillsvidare » = à durée
 * indéterminée, « Deltid » = temps partiel. Tout ce qui n'est pas à durée
 * indéterminée est traité comme CONTRACT (CDD, intérim, saisonnier…).
 */
function inferJobTechContractKey(hit: JobTechHit): string {
  const duration = fold(hit.duration?.label ?? "");
  const hours = fold(hit.working_hours_type?.label ?? "");
  if (!duration.includes("tillsvidare")) return "employment_contract";
  if (hours.includes("deltid")) return "employment_part_time";
  return "employment_full_time";
}

function toRawOffer(hit: JobTechHit): RawOffer | null {
  const title = hit.headline?.trim();
  const company = hit.employer?.name?.trim();
  const url = hit.webpage_url;
  const description = hit.description?.text?.trim();
  const city = hit.workplace_address?.city ?? hit.workplace_address?.municipality;
  if (!title || !company || !url || !description || description.length < 20 || !city) return null;

  const [lng, lat] = hit.workplace_address?.coordinates ?? [];

  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 6000),
    contractType: inferJobTechContractKey(hit),
    remotePolicy: inferRemotePolicy(title, description),
    educationLevel: inferEducationLevel(title, description),
    sector: hit.occupation_field?.label ?? TECH_SECTOR,
    sourceUrl: url,
    scrapedAt: new Date(),
    countryCode: "SE",
    ...(hit.publication_date ? { publishedAt: new Date(hit.publication_date) } : {}),
    ...(hit.logo_url ? { companyLogoUrl: hit.logo_url } : {}),
    ...(typeof lat === "number" && typeof lng === "number"
      ? { latitude: lat, longitude: lng }
      : {}),
  };
}

export class ArbetsformedlingenConnector implements SourceConnector {
  readonly sourceSite = "arbetsformedlingen.se";
  readonly label = "Arbetsförmedlingen (Suède)";
  readonly acceptedContracts: ReadonlySet<ContractType> = new Set([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "STAGE",
    "ALTERNANCE",
  ]);

  isEnabled(): boolean {
    return true; // API publique officielle, aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const raw: RawOffer[] = [];
    const seen = new Set<string>();

    for (const query of QUERIES) {
      const url = new URL(API);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(RESULTS_PER_QUERY));

      let json: JobTechResponse | null;
      try {
        json = await fetchJson<JobTechResponse>(url, { timeoutMs: 15_000 });
      } catch (err) {
        if (err instanceof RateLimitedError) return raw;
        throw err;
      }
      if (!json) continue;

      for (const hit of json.hits ?? []) {
        // Filtre tech : occupation_field officiel de la taxonomie JobTech,
        // plus fiable qu'un filtre par mots-clés sur le titre.
        if (hit.occupation_field?.label !== "Data/IT") continue;
        if (seen.has(hit.id)) continue;
        seen.add(hit.id);
        const mapped = toRawOffer(hit);
        if (mapped) raw.push(mapped);
      }
    }
    return raw;
  }
}

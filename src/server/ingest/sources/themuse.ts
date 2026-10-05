import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchJson } from "@/server/ingest/http";
import { htmlToText } from "@/server/ingest/html-to-text";
import { geocodeCityFull } from "./geocode";
import { TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur The Muse — API publique (aucune clé requise).
 * Source de repli « zéro configuration » : le site affiche de vraies offres dès
 * le premier démarrage, même sans identifiants France Travail. On interroge
 * l'API ville par ville (son filtre `location` global mélange le remote mondial)
 * et on ne retient que les stages tech réellement localisés en France. Chaque
 * offre pointe vers sa page d'annonce réelle (`refs.landing_page`).
 *
 * Volume volontairement modeste ; France Travail fournit la couverture complète.
 * Aucune clé n’est envoyée : quota public uniquement.
 */

const API = "https://www.themuse.com/api/public/jobs";
const TECH_CATEGORIES = [
  "Software Engineering",
  "Data Science",
  "Computer and IT",
  "Data and Analytics",
  "Design and UX",
  "Product Management",
];
const FRENCH_CITIES = [
  "Paris",
  "Lyon",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Marseille",
  "Grenoble",
  "Sophia Antipolis",
  "Rennes",
];
const PAGES_PER_CITY = 2;

type MuseJob = {
  id: number;
  name: string;
  contents?: string;
  company?: { id?: number; name?: string };
  locations?: Array<{ name?: string }>;
  categories?: Array<{ name?: string }>;
  levels?: Array<{ name?: string }>;
  publication_date?: string;
  refs?: { landing_page?: string };
};

/** Ville française du poste (locations "Ville, France"), ou null. */
function frenchCity(locations: MuseJob["locations"]): string | null {
  for (const loc of locations ?? []) {
    const name = loc.name ?? "";
    if (/,\s*France$/i.test(name)) return name.replace(/,\s*France$/i, "").trim();
  }
  return null;
}

function isTech(job: MuseJob): boolean {
  return (job.categories ?? []).some((c) =>
    TECH_CATEGORIES.some((t) => (c.name ?? "").toLowerCase() === t.toLowerCase()),
  );
}

async function toRawOffer(job: MuseJob): Promise<RawOffer | null> {
  const company = job.company?.name?.trim();
  const url = job.refs?.landing_page;
  const city = frenchCity(job.locations);
  if (!company || !url || !city) return null;

  const isInternship = (job.levels ?? []).some((l) => /internship|stage/i.test(l.name ?? ""));
  if (!isInternship || !isTech(job)) return null;

  const description = htmlToText(job.contents ?? "");
  if (description.length < 20) return null;

  const geo = await geocodeCityFull(city);
  return {
    title: job.name.trim().slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 6000),
    contractType: "stage",
    remotePolicy: inferRemotePolicy(job.name, city, description),
    educationLevel: inferEducationLevel(job.name, description),
    sector: TECH_SECTOR,
    sourceUrl: url,
    scrapedAt: new Date(),
    ...(job.publication_date ? { publishedAt: new Date(job.publication_date) } : {}),
    // Logos The Muse servis par convention d'URL ; l'UI retombe sur l'initiale si 404.
    ...(job.company?.id
      ? {
          companyLogoUrl: `https://assets.themuse.com/uploaded/companies/${job.company.id}/small_logo.png`,
        }
      : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class TheMuseConnector implements SourceConnector {
  readonly sourceSite = "themuse.com";
  readonly label = "The Muse";

  isEnabled(): boolean {
    return true; // API publique : toujours disponible.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const raw: RawOffer[] = [];
    const seen = new Set<number>();

    for (const city of FRENCH_CITIES) {
      for (let page = 0; page < PAGES_PER_CITY; page++) {
        const url = new URL(API);
        url.searchParams.set("page", String(page));
        url.searchParams.set("location", `${city}, France`);

        // Retries, backoff et throttle mutualisés (voir `ingest/http.ts`).
        let json: { results?: MuseJob[]; page_count?: number } | null;
        try {
          json = await fetchJson<{ results?: MuseJob[]; page_count?: number }>(url, {
            timeoutMs: 20_000,
            headers: { "User-Agent": "Jobly/1.0" },
          });
        } catch (err) {
          // Hôte coupé par le disjoncteur : on rend l'acquis au lieu de tout perdre.
          if (err instanceof RateLimitedError) return raw;
          throw err;
        }
        // 400 = au-delà de la dernière page ; null = ville sans résultats.
        if (!json) break;

        for (const job of json.results ?? []) {
          if (seen.has(job.id)) continue;
          seen.add(job.id);
          const mapped = await toRawOffer(job);
          if (mapped) raw.push(mapped);
        }
        if (json.page_count != null && page >= json.page_count - 1) break;
      }
    }
    return raw;
  }
}

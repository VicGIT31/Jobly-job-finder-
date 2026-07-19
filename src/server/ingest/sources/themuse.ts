import type { RawOffer } from "@/server/ingest/normalize";
import { geocodeCity } from "./geocode";
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
 * Clé optionnelle THEMUSE_API_KEY pour augmenter le quota (non requise).
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

function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

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

function toRawOffer(job: MuseJob): RawOffer | null {
  const company = job.company?.name?.trim();
  const url = job.refs?.landing_page;
  const city = frenchCity(job.locations);
  if (!company || !url || !city) return null;

  const isInternship = (job.levels ?? []).some((l) => /internship|stage/i.test(l.name ?? ""));
  if (!isInternship || !isTech(job)) return null;

  const description = htmlToText(job.contents ?? "");
  if (description.length < 20) return null;

  const geo = geocodeCity(city);
  return {
    title: job.name.trim().slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 6000),
    contractType: "stage",
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
    const apiKey = process.env.THEMUSE_API_KEY;
    const raw: RawOffer[] = [];
    const seen = new Set<number>();

    for (const city of FRENCH_CITIES) {
      for (let page = 0; page < PAGES_PER_CITY; page++) {
        const url = new URL(API);
        url.searchParams.set("page", String(page));
        url.searchParams.set("location", `${city}, France`);
        if (apiKey) url.searchParams.set("api_key", apiKey);

        let json: { results?: MuseJob[]; page_count?: number };
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "NextStep/1.0" },
            signal: AbortSignal.timeout(20_000),
          });
          if (res.status === 400) break; // au-delà de la dernière page
          if (!res.ok) break; // ville sans résultats / throttling : on passe
          json = (await res.json()) as { results?: MuseJob[]; page_count?: number };
        } catch {
          break; // erreur réseau sur cette ville : on continue avec les autres
        }

        for (const job of json.results ?? []) {
          if (seen.has(job.id)) continue;
          seen.add(job.id);
          const mapped = toRawOffer(job);
          if (mapped) raw.push(mapped);
        }
        if (json.page_count != null && page >= json.page_count - 1) break;
      }
    }
    return raw;
  }
}

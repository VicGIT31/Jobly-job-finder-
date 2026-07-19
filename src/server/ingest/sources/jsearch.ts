import type { RawOffer } from "@/server/ingest/normalize";
import { geocodeCity } from "./geocode";
import { TECH_SECTOR, techQueries, type SourceConnector } from "./types";

/**
 * Connecteur JSearch (Google for Jobs, via RapidAPI) — couvre **Indeed et
 * Glassdoor**, qui bloquent tout scraping direct côté serveur (403 / captcha).
 * JSearch agrège Google for Jobs légalement ; on ne conserve que les annonces
 * publiées par Indeed ou Glassdoor, chacune attribuée à sa vraie source
 * (`sourceSite` par offre) avec son lien de candidature réel.
 *
 * Nécessite une clé RapidAPI gratuite (`RAPIDAPI_KEY`) :
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 * Sans clé, le connecteur est simplement désactivé.
 */

const HOST = "jsearch.p.rapidapi.com";
// La recherche JSearch est puissante : on limite le nombre de requêtes pour
// rester dans le quota gratuit (≈200/mois), le pipeline dédoublonne le reste.
const QUERIES = techQueries().slice(0, 8);
const PAGES_PER_QUERY = 1;

type JSearchJob = {
  job_title?: string;
  employer_name?: string;
  employer_logo?: string;
  job_city?: string;
  job_description?: string;
  job_apply_link?: string;
  job_publisher?: string;
  job_posted_at_datetime_utc?: string;
};

/** Mappe un éditeur JSearch vers un domaine source, ou null si hors cible. */
function targetSource(job: JSearchJob): string | null {
  const publisher = (job.job_publisher ?? "").toLowerCase();
  const link = (job.job_apply_link ?? "").toLowerCase();
  if (publisher.includes("glassdoor") || link.includes("glassdoor.")) return "glassdoor.fr";
  if (publisher.includes("indeed") || link.includes("indeed.")) return "indeed.com";
  return null;
}

function toRawOffer(job: JSearchJob, sourceSite: string): RawOffer | null {
  const title = job.job_title?.trim();
  const company = job.employer_name?.trim();
  const city = job.job_city?.trim();
  const url = job.job_apply_link?.trim();
  const description = job.job_description?.trim();
  if (!title || !company || !city || !url || !description || description.length < 20) return null;

  const isAlt = /alternance|apprentissage|alternant/i.test(title);
  const geo = geocodeCity(city);
  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 8000),
    contractType: isAlt ? "alternance" : "stage",
    sector: TECH_SECTOR,
    sourceUrl: url,
    sourceSite,
    scrapedAt: new Date(),
    ...(job.job_posted_at_datetime_utc
      ? { publishedAt: new Date(job.job_posted_at_datetime_utc) }
      : {}),
    ...(job.employer_logo?.startsWith("http") ? { companyLogoUrl: job.employer_logo } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class JSearchConnector implements SourceConnector {
  // sourceSite par défaut ; chaque offre porte sa vraie source (Indeed/Glassdoor).
  readonly sourceSite = "indeed.com";
  readonly label = "Indeed + Glassdoor (via JSearch)";

  isEnabled(): boolean {
    return Boolean(process.env.RAPIDAPI_KEY);
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const key = process.env.RAPIDAPI_KEY!;
    const offers: RawOffer[] = [];
    const seen = new Set<string>();

    for (const query of QUERIES) {
      for (let page = 1; page <= PAGES_PER_QUERY; page++) {
        const url = new URL(`https://${HOST}/search`);
        url.searchParams.set("query", `${query} France`);
        url.searchParams.set("page", String(page));
        url.searchParams.set("num_pages", "1");
        url.searchParams.set("country", "fr");
        url.searchParams.set("date_posted", "month");

        let data: { data?: JSearchJob[] };
        try {
          const res = await fetch(url, {
            headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST },
            signal: AbortSignal.timeout(20_000),
          });
          if (!res.ok) break;
          data = (await res.json()) as { data?: JSearchJob[] };
        } catch {
          break;
        }

        for (const job of data.data ?? []) {
          const source = targetSource(job);
          if (!source) continue;
          const link = job.job_apply_link ?? "";
          if (seen.has(link)) continue;
          seen.add(link);
          const mapped = toRawOffer(job, source);
          if (mapped) offers.push(mapped);
        }
      }
    }
    return offers;
  }
}

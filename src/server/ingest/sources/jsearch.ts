import type { RawOffer } from "@/server/ingest/normalize";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchJson } from "@/server/ingest/http";
import { geocodeCityFull } from "./geocode";
import { TECH_SECTOR, techQueries, type SourceConnector } from "./types";

/**
 * Connecteur JSearch (OpenWeb Ninja) — agrégateur de **Google for Jobs**.
 *
 * C'est la source la plus large du dispositif : une seule API donne accès aux
 * annonces republiées par Indeed, Glassdoor, HelloWork, Meteojob, l'APEC,
 * France Travail, WIZBII, BeBee, **JobTeaser et Welcome to the Jungle** — ces
 * deux derniers étant inaccessibles en direct (auth école, clé Algolia
 * chiffrée). Chaque annonce conserve **le lien de candidature réel** chez son
 * éditeur, et c'est le domaine de ce lien qui sert d'attribution de source.
 *
 * Nécessite `JSEARCH_API_KEY` (openwebninja.com). Sans clé, connecteur ignoré.
 */

const API = "https://api.openwebninja.com/jsearch/search-v2";

/**
 * Budget de requêtes par cycle. L'API est facturée à l'appel : on préfère un
 * balayage régulier et modeste (le pipeline déduplique d'un cycle à l'autre)
 * plutôt qu'une rafale qui épuiserait le quota mensuel en une journée.
 */
const QUERIES = techQueries().slice(0, 12);
const PAGES_PER_QUERY = 2;

type JSearchJob = {
  job_title?: string;
  employer_name?: string;
  employer_logo?: string;
  job_city?: string;
  job_location?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  apply_options?: Array<{ publisher?: string; apply_link?: string }>;
  job_publisher?: string;
  job_posted_at_datetime_utc?: string;
  job_is_remote?: boolean;
  job_latitude?: number;
  job_longitude?: number;
  job_min_salary?: number;
  job_max_salary?: number;
};

type JSearchResponse = { data?: { jobs?: JSearchJob[]; cursor?: string } };

/**
 * Lien de candidature : `job_apply_link` pointe parfois vers Google plutôt que
 * vers l'éditeur ; on prend alors la première option de candidature directe.
 */
function applyLink(job: JSearchJob): string | null {
  const direct = job.job_apply_link?.trim();
  const isGoogle = direct ? /(^|\.)google\.[a-z.]+$/i.test(safeHost(direct) ?? "") : true;
  if (direct && !isGoogle) return direct;

  const option = job.apply_options?.find((o) => {
    const host = safeHost(o.apply_link ?? "");
    return host && !/(^|\.)google\.[a-z.]+$/i.test(host);
  });
  return option?.apply_link?.trim() ?? direct ?? null;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export class JSearchConnector implements SourceConnector {
  // Attribution par défaut ; chaque offre porte en réalité le domaine de son
  // éditeur (indeed.com, welcometothejungle.com, jobteaser.com…).
  readonly sourceSite = "google-for-jobs";
  readonly label = "JSearch (Google for Jobs)";

  isEnabled(): boolean {
    return Boolean(process.env.JSEARCH_API_KEY);
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const key = process.env.JSEARCH_API_KEY!;
    const offers: RawOffer[] = [];
    const seen = new Set<string>();

    for (const query of QUERIES) {
      let cursor: string | undefined;

      for (let page = 0; page < PAGES_PER_QUERY; page++) {
        const url = new URL(API);
        url.searchParams.set("query", `${query} France`);
        url.searchParams.set("country", "fr");
        url.searchParams.set("date_posted", "month");
        if (cursor) url.searchParams.set("cursor", cursor);

        let json: JSearchResponse | null;
        try {
          json = await fetchJson<JSearchResponse>(url, {
            timeoutMs: 25_000,
            // API payante : on espace les appels et on rejoue peu.
            minIntervalMs: 1_200,
            retries: 1,
            headers: { "X-API-Key": key },
          });
        } catch (err) {
          // Quota épuisé : on rend l'acquis, le prochain cycle reprendra.
          if (err instanceof RateLimitedError) return offers;
          throw err;
        }

        const jobs = json?.data?.jobs ?? [];
        if (jobs.length === 0) break;

        for (const job of jobs) {
          const mapped = await toRawOffer(job, seen);
          if (mapped) offers.push(mapped);
        }

        // Pagination par curseur (l'API v2 ignore un numéro de page).
        cursor = json?.data?.cursor;
        if (!cursor) break;
      }
    }

    return offers;
  }
}

async function toRawOffer(job: JSearchJob, seen: Set<string>): Promise<RawOffer | null> {
  const title = job.job_title?.trim();
  const company = job.employer_name?.trim();
  const description = job.job_description?.trim();
  if (!title || !company || !description || description.length < 20) return null;

  // Périmètre France : le pays est parfois absent, jamais faux quand présent.
  if (job.job_country && job.job_country.toUpperCase() !== "FR") return null;

  // `job_city` est souvent nul alors que `job_location` porte la commune.
  const city = (job.job_city ?? job.job_location ?? "").split(",")[0].trim();
  if (!city) return null;

  const url = applyLink(job);
  if (!url) return null;
  if (seen.has(url)) return null;
  seen.add(url);

  // Attribution : le domaine du lien de candidature est la source réelle de
  // l'annonce, plus fiable que le libellé d'éditeur (« Hellowork » vs « HelloWork »).
  const sourceSite = safeHost(url);

  const contractType = inferContractType(title, description.slice(0, 1200)) ?? "stage";

  const geo =
    job.job_latitude != null && job.job_longitude != null
      ? { lat: job.job_latitude, lng: job.job_longitude }
      : await geocodeCityFull(city);

  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 8000),
    contractType,
    // Champ structuré de l'API quand il est vrai, déduction du texte sinon.
    remotePolicy: job.job_is_remote ? "remote" : inferRemotePolicy(title, description),
    educationLevel: inferEducationLevel(title, description),
    sector: TECH_SECTOR,
    sourceUrl: url,
    ...(sourceSite ? { sourceSite } : {}),
    scrapedAt: new Date(),
    ...(job.job_posted_at_datetime_utc
      ? { publishedAt: new Date(job.job_posted_at_datetime_utc) }
      : {}),
    ...(job.job_min_salary ? { salaryMin: Math.round(job.job_min_salary) } : {}),
    ...(job.job_max_salary ? { salaryMax: Math.round(job.job_max_salary) } : {}),
    ...(job.employer_logo?.startsWith("http") ? { companyLogoUrl: job.employer_logo } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

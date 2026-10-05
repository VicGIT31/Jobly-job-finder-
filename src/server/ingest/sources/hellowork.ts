import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { studentContract, isTechOffer } from "../scope";
import { RateLimitedError, fetchText, isHostCircuitOpen, mapPool } from "@/server/ingest/http";
import {
  employmentContractType,
  extractJobPosting,
  jobLocationCity,
  jobLocationCountry,
  jsonLdText,
} from "@/server/ingest/jsonld";
import { geocodeCityFull } from "./geocode";
import { TECH_KEYWORDS, TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur HelloWork (ex RegionsJob) — premier job board généraliste français
 * en volume. Aucune clé requise.
 *
 * Les pages d'offres exposent un bloc **schema.org `JobPosting`** (celui que
 * consomme Google for Jobs) : on le lit plutôt que de gratter le HTML, ce qui
 * rend le connecteur insensible aux refontes de maquette. La page de résultats
 * ne sert qu'à récupérer les identifiants d'annonces.
 *
 * Comme LinkedIn, on **alterne recherche et détails par lots** : si HelloWork
 * nous throttle en cours de route, les offres déjà complètes sont conservées.
 */

const SEARCH_URL = "https://www.hellowork.com/fr-fr/emploi/recherche.html";
const OFFER_URL = "https://www.hellowork.com/fr-fr/emplois";
const HOST = "www.hellowork.com";

/** Filtres de contrat HelloWork (paramètre `c`). */
const CONTRACTS: Array<{ param: string; fallback: string }> = [
  { param: "Stage", fallback: "stage" },
  { param: "Alternance", fallback: "alternance" },
];

const QUERIES = TECH_KEYWORDS.slice(0, 12);
const DETAIL_CONCURRENCY = 4;
const QUERY_BATCH = 3;
const HTTP = { minIntervalMs: 350, retries: 2, timeoutMs: 15_000 };

type Listing = { id: string; fallbackContract: string };

/** Identifiants d'annonces présents dans une page de résultats. */
export function parseListingIds(html: string): string[] {
  const ids = new Set<string>();
  const re = /\/fr-fr\/emplois\/(\d+)\.html/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) ids.add(match[1]);
  return [...ids];
}

async function toRawOffer(listing: Listing): Promise<RawOffer | null> {
  const url = `${OFFER_URL}/${listing.id}.html`;
  const html = await fetchText(url, { ...HTTP, cacheTtlMs: 4 * 60 * 60 * 1000 });
  if (!html) return null;

  const posting = extractJobPosting(html);
  if (!posting) return null;

  const title = posting.title?.trim();
  const company = posting.hiringOrganization?.name?.trim();
  const city = jobLocationCity(posting);
  if (!title || !company || !city) return null;

  // Périmètre France : HelloWork publie quelques annonces frontalières.
  const country = jobLocationCountry(posting);
  if (country && country !== "FR" && country !== "FRANCE") return null;

  const description = jsonLdText(posting.description ?? "");
  if (description.length < 20) return null;

  // Contrat : le texte d'abord (titre/description), le champ structuré
  // ensuite, le filtre de recherche en dernier recours. Le champ structuré
  // schema.org `employmentType` de HelloWork ne distingue pas stage et
  // alternance — les deux sont exposés sous "INTERN" — alors que le titre
  // le dit explicitement dans l'immense majorité des annonces (« Alternance
  // … » vs « Stage … »). Trouvé en conditions réelles : 252 offres dont le
  // titre contient « Alternance » stockées avec contractType = STAGE tant
  // que le champ structuré était consulté en premier.
  const contractType = studentContract(title, employmentContractType(posting) ?? "", description);
  if (!contractType || !isTechOffer(title, description)) return null;

  const geo = await geocodeCityFull(city);

  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 8000),
    contractType,
    remotePolicy:
      posting.jobLocationType === "TELECOMMUTE" ? "remote" : inferRemotePolicy(title, description),
    educationLevel: inferEducationLevel(title, description),
    sector: TECH_SECTOR,
    sourceUrl: url,
    scrapedAt: new Date(),
    ...(posting.datePosted ? { publishedAt: new Date(posting.datePosted) } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class HelloWorkConnector implements SourceConnector {
  readonly sourceSite = "hellowork.com";
  readonly label = "HelloWork";

  isEnabled(): boolean {
    return true; // Pages publiques : aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const offers: RawOffer[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < QUERIES.length; i += QUERY_BATCH) {
      const batch = QUERIES.slice(i, i + QUERY_BATCH);

      let listings: Listing[];
      try {
        listings = await this.collectListings(batch, seen);
      } catch (err) {
        if (err instanceof RateLimitedError) break;
        throw err;
      }

      offers.push(...(await mapPool(listings, DETAIL_CONCURRENCY, (l) => toRawOffer(l))));

      if (isHostCircuitOpen(HOST)) {
        console.warn(
          `[hellowork] Rate limit atteint — cycle arrêté avec ${offers.length} offre(s).`,
        );
        break;
      }
    }

    return offers;
  }

  /** Recherche un lot de mots-clés × contrats et déduplique les identifiants. */
  private async collectListings(keywords: string[], seen: Set<string>): Promise<Listing[]> {
    const listings: Listing[] = [];

    for (const keyword of keywords) {
      for (const contract of CONTRACTS) {
        const url = new URL(SEARCH_URL);
        url.searchParams.set("k", keyword);
        url.searchParams.set("c", contract.param);

        let html: string | null;
        try {
          html = await fetchText(url, HTTP);
        } catch (err) {
          // Hôte coupé : on rend le lot partiel, ses détails seront tentés.
          if (err instanceof RateLimitedError) return listings;
          throw err;
        }
        if (!html) continue;

        for (const id of parseListingIds(html)) {
          if (seen.has(id)) continue;
          seen.add(id);
          listings.push({ id, fallbackContract: contract.fallback });
        }
      }
    }

    return listings;
  }
}

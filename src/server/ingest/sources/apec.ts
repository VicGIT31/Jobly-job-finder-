import type { RawOffer } from "@/server/ingest/normalize";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchWithRetry } from "@/server/ingest/http";
import { geocodeCityFull } from "./geocode";
import { TECH_KEYWORDS, TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur APEC — l'API publique qui alimente le moteur de recherche du site
 * (`/cms/webservices/rechercheOffre`, POST JSON). Aucune clé requise.
 *
 * L'APEC est la référence du marché cadre en France : ~115 000 offres, dont
 * ~1 400 en alternance. C'est la meilleure source française sans clé après
 * France Travail, et la seule qui renvoie **la description dans les résultats
 * de recherche** — aucune requête de détail n'est nécessaire, ce qui la rend
 * rapide et peu exposée au rate-limit.
 *
 * `typesContrat: 20053` = alternance / apprentissage (vérifié : les autres
 * identifiants correspondent au CDI, au CDD et à l'intérim, hors périmètre).
 */

const SEARCH_URL = "https://www.apec.fr/cms/webservices/rechercheOffre";
const OFFER_URL = "https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre";

/** Identifiant APEC du contrat « alternance / apprentissage ». */
const CONTRACT_ALTERNANCE = 20053;

/** L'APEC répond large : quelques métiers cœur suffisent à couvrir la tech. */
const QUERIES = TECH_KEYWORDS.slice(0, 14);
const PAGE_SIZE = 50;
const PAGES_PER_QUERY = 2;

type ApecOffer = {
  intitule?: string;
  nomCommercial?: string;
  lieuTexte?: string;
  texteOffre?: string;
  numeroOffre?: string;
  datePublication?: string;
  salaireTexte?: string;
  latitude?: number;
  longitude?: number;
};

type ApecResponse = { resultats?: ApecOffer[]; totalCount?: number };

/** "Moussy-le-Neuf - 77" → "Moussy-le-Neuf" ; "Paris 15e - 75" → "Paris". */
function parseCity(lieu: string): string {
  return lieu
    .replace(/\s*-\s*\d{2,3}\s*$/, "")
    .replace(/\s+\d+e(r|me)?\s*$/i, "")
    .trim();
}

async function searchPage(
  keywords: string,
  startIndex: number,
): Promise<{ offers: ApecOffer[]; total: number } | null> {
  const response = await fetchWithRetry(SEARCH_URL, {
    method: "POST",
    body: JSON.stringify({
      motsCles: keywords,
      typesContrat: [CONTRACT_ALTERNANCE],
      pagination: { range: PAGE_SIZE, startIndex },
    }),
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    timeoutMs: 20_000,
    minIntervalMs: 400,
  });
  if (!response) return null;

  try {
    const json = (await response.json()) as ApecResponse;
    return { offers: json.resultats ?? [], total: json.totalCount ?? 0 };
  } catch {
    return null;
  }
}

async function toRawOffer(offer: ApecOffer): Promise<RawOffer | null> {
  const title = offer.intitule?.trim();
  const company = offer.nomCommercial?.trim();
  const lieu = offer.lieuTexte?.trim();
  const description = offer.texteOffre?.trim();
  const reference = offer.numeroOffre?.trim();
  if (!title || !company || !lieu || !reference) return null;
  if (!description || description.length < 20) return null;

  const city = parseCity(lieu);
  if (!city) return null;

  // Coordonnées fournies par l'APEC en priorité, géocodage en secours.
  const geo =
    offer.latitude != null && offer.longitude != null
      ? { lat: offer.latitude, lng: offer.longitude }
      : await geocodeCityFull(city);

  // Le filtre APEC ne renvoie que de l'alternance ; le titre peut préciser
  // « stage » sur certaines annonces mixtes.
  const contractType = inferContractType(title, description) ?? "alternance";

  return {
    title: title.slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description: description.slice(0, 8000),
    contractType,
    remotePolicy: inferRemotePolicy(title, description),
    educationLevel: inferEducationLevel(title, description),
    sector: TECH_SECTOR,
    sourceUrl: `${OFFER_URL}/${reference}`,
    scrapedAt: new Date(),
    ...(offer.datePublication ? { publishedAt: new Date(offer.datePublication) } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class ApecConnector implements SourceConnector {
  readonly sourceSite = "apec.fr";
  readonly label = "APEC";

  isEnabled(): boolean {
    return true; // API publique du moteur de recherche : aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const offers: RawOffer[] = [];
    const seen = new Set<string>();

    for (const keyword of QUERIES) {
      for (let page = 0; page < PAGES_PER_QUERY; page++) {
        let result: { offers: ApecOffer[]; total: number } | null;
        try {
          result = await searchPage(keyword, page * PAGE_SIZE);
        } catch (err) {
          // Hôte coupé par le disjoncteur : on rend l'acquis.
          if (err instanceof RateLimitedError) return offers;
          throw err;
        }
        if (!result || result.offers.length === 0) break;

        for (const raw of result.offers) {
          const reference = raw.numeroOffre?.trim();
          if (!reference || seen.has(reference)) continue;
          seen.add(reference);
          const mapped = await toRawOffer(raw);
          if (mapped) offers.push(mapped);
        }

        if ((page + 1) * PAGE_SIZE >= result.total) break;
      }
    }

    return offers;
  }
}

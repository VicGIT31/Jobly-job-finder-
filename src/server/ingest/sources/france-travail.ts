import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchWithRetry, mapPool } from "@/server/ingest/http";
import { geocodeCityFull } from "./geocode";
import { TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur France Travail (ex-Pôle Emploi) — API « Offres d'emploi v2 ».
 * Source officielle et exhaustive des offres en France. Couvre les stages et
 * l'alternance (apprentissage + professionnalisation) sur les métiers tech,
 * ciblés par codes ROME. Chaque offre porte l'URL réelle de l'annonce.
 *
 * Nécessite des identifiants OAuth2 (gratuits) créés sur https://francetravail.io :
 *   FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET
 */

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
const SCOPE = "api_offresdemploiv2 o2dsoffre";

// Codes ROME du domaine informatique / tech (études, dev, data, réseaux, support).
const TECH_ROME = [
  "M1805", // Études et développement informatique
  "M1806", // Conseil et maîtrise d'ouvrage en SI
  "M1810", // Production et exploitation de SI
  "M1802", // Expertise et support en SI
  "M1803", // Direction des SI
  "M1804", // Études et développement de réseaux télécoms
  "M1809", // Information géographique
  "M1811", // Data / IA
];

// natureContrat : E2 = professionnalisation, FS = apprentissage → alternance.
const ALT_NATURES = ["E2", "FS"];

type FTOffer = {
  id: string;
  intitule: string;
  description?: string;
  entreprise?: { nom?: string; logo?: string };
  lieuTravail?: { libelle?: string; latitude?: number; longitude?: number };
  typeContrat?: string;
  typeContratLibelle?: string;
  natureContrat?: string;
  alternance?: boolean;
  dateCreation?: string;
  origineOffre?: { urlOrigine?: string };
  salaire?: { libelle?: string };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: SCOPE,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`France Travail OAuth ${res.status} : ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

/** Un appel de recherche paginé (range max 149 par page côté API). */
async function searchPage(
  token: string,
  params: Record<string, string>,
): Promise<{ offers: FTOffer[]; total: number }> {
  const url = new URL(SEARCH_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // L'API France Travail throttle les partenaires : retries + backoff mutualisés.
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 20_000,
    minIntervalMs: 400,
  });
  // 204 = aucune offre ; 206 = résultat partiel (pagination) ; 200 = complet.
  // `null` = échec définitif après retries → page ignorée, pagination arrêtée.
  if (!res || res.status === 204) return { offers: [], total: 0 };
  const total = Number(res.headers.get("Content-Range")?.split("/")[1] ?? "0");
  const json = (await res.json()) as { resultats?: FTOffer[] };
  return { offers: json.resultats ?? [], total };
}

async function toRawOffer(o: FTOffer): Promise<RawOffer | null> {
  const company = o.entreprise?.nom?.trim();
  const city = o.lieuTravail?.libelle?.replace(/^\d{2,3}\s*-\s*/, "").trim();
  const url = o.origineOffre?.urlOrigine;
  const description = o.description?.trim();
  if (!company || !city || !url || !description || description.length < 20) return null;

  // Détermine stage vs alternance ; tout le reste sera rejeté par le pipeline.
  const isAlt =
    o.alternance === true ||
    (o.natureContrat != null && ALT_NATURES.includes(o.natureContrat)) ||
    /alternance|apprentissage|professionnalisation/i.test(o.typeContratLibelle ?? "");
  const isStage = o.typeContrat === "STG" || /stage/i.test(o.typeContratLibelle ?? "");
  const contractType = isAlt ? "alternance" : isStage ? "stage" : (o.typeContrat ?? "");

  // Coordonnées de l'API France Travail en priorité, géocodage sinon.
  const geo =
    o.lieuTravail?.latitude != null && o.lieuTravail?.longitude != null
      ? { lat: o.lieuTravail.latitude, lng: o.lieuTravail.longitude }
      : ((await geocodeCityFull(city)) ?? { lat: undefined, lng: undefined });

  return {
    title: o.intitule.trim().slice(0, 200),
    companyName: company.slice(0, 120),
    city: city.slice(0, 120),
    description,
    contractType,
    remotePolicy: inferRemotePolicy(o.intitule, city, description),
    educationLevel: inferEducationLevel(o.intitule, description),
    sector: TECH_SECTOR,
    sourceUrl: url,
    scrapedAt: new Date(),
    ...(o.dateCreation ? { publishedAt: new Date(o.dateCreation) } : {}),
    ...(o.entreprise?.logo?.startsWith("http") ? { companyLogoUrl: o.entreprise.logo } : {}),
    ...(geo.lat != null && geo.lng != null ? { latitude: geo.lat, longitude: geo.lng } : {}),
  };
}

export class FranceTravailConnector implements SourceConnector {
  readonly sourceSite = "francetravail.fr";
  readonly label = "France Travail";

  isEnabled(): boolean {
    return Boolean(
      process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
    );
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID!;
    const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET!;
    const token = await getToken(clientId, clientSecret);

    const romes = TECH_ROME.join(",");
    // Deux passes : alternance (natureContrat) et stages (typeContrat=STG).
    const queries: Array<Record<string, string>> = [
      { codeROME: romes, natureContrat: ALT_NATURES.join(","), paysContinent: "01" },
      { codeROME: romes, typeContrat: "STG", paysContinent: "01" },
    ];

    const raw: RawOffer[] = [];
    for (const base of queries) {
      // Pagination par tranches de 150 (limite API : range 0-149, etc.).
      for (let start = 0; start < 1050; start += 150) {
        let page: { offers: FTOffer[]; total: number };
        try {
          page = await searchPage(token, { ...base, range: `${start}-${start + 149}` });
        } catch (err) {
          // Partenaire throttlé : on rend l'acquis plutôt que de perdre le cycle.
          if (err instanceof RateLimitedError) return raw;
          throw err;
        }
        // Le géocodage de secours est réseau : on mappe en parallèle borné.
        raw.push(...(await mapPool(page.offers, 6, (o) => toRawOffer(o))));
        if (start + 150 >= page.total || page.offers.length === 0) break;
      }
    }
    return raw;
  }
}

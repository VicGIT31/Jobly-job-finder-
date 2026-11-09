import { fetchJson } from "@/server/ingest/http";
import communes from "../../../../config/communes-haute-garonne.json";

/**
 * Géocodage léger des principales villes françaises (lat/lng réels).
 * Suffisant pour la recherche géo « à moins de X km » sur les offres ingérées ;
 * les villes inconnues sont laissées sans coordonnées (recherche géo ignorée).
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  agen: { lat: 44.2031, lng: 0.6164 },
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.764, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
  bordeaux: { lat: 44.8378, lng: -0.5792 },
  nantes: { lat: 47.2184, lng: -1.5536 },
  lille: { lat: 50.6292, lng: 3.0573 },
  strasbourg: { lat: 48.5734, lng: 7.7521 },
  rennes: { lat: 48.1173, lng: -1.6778 },
  montpellier: { lat: 43.6108, lng: 3.8767 },
  grenoble: { lat: 45.1885, lng: 5.7245 },
  nice: { lat: 43.7102, lng: 7.262 },
  nancy: { lat: 48.6921, lng: 6.1844 },
  reims: { lat: 49.2583, lng: 4.0317 },
  "aix-en-provence": { lat: 43.5297, lng: 5.4474 },
  sophia: { lat: 43.6236, lng: 7.0522 },
  "sophia antipolis": { lat: 43.6236, lng: 7.0522 },
  clermont: { lat: 45.7772, lng: 3.087 },
  "clermont-ferrand": { lat: 45.7772, lng: 3.087 },
  tours: { lat: 47.3941, lng: 0.6848 },
  angers: { lat: 47.4784, lng: -0.5632 },
  dijon: { lat: 47.322, lng: 5.0415 },
  brest: { lat: 48.3904, lng: -4.4861 },
  "saint-etienne": { lat: 45.4397, lng: 4.3872 },
  toulon: { lat: 43.1242, lng: 5.928 },
  "le mans": { lat: 48.0061, lng: 0.1996 },
  orleans: { lat: 47.9029, lng: 1.909 },
  caen: { lat: 49.1829, lng: -0.3707 },
  metz: { lat: 49.1193, lng: 6.1757 },
  besancon: { lat: 47.238, lng: 6.0243 },
  pau: { lat: 43.2951, lng: -0.3708 },
  "la defense": { lat: 48.8918, lng: 2.2419 },
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Retourne les coordonnées d'une ville française, ou null si inconnue. */
export function geocodeCity(city: string): { lat: number; lng: number } | null {
  if (!city) return null;
  const key = stripAccents(city).toLowerCase().trim();
  const normalized = key.replace(/\s*\(?\d{2,5}\)?\s*$/, "").replace(/\s*\([^)]*\)\s*$/, "").replace(/-/g, " ").trim();
  const commune = communes.find((entry) => stripAccents(entry.nom).toLowerCase().replace(/-/g, " ") === normalized || entry.codesPostaux?.includes(normalized));
  if (commune?.centre?.coordinates) return { lat: commune.centre.coordinates[1], lng: commune.centre.coordinates[0] };
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // "Paris 15e", "Lyon 3e Arrondissement", "Nantes (44)" → ville de base
  const base = key
    .replace(/\s*\(?\d.*$/, "")
    .replace(/\s+\d+e.*$/, "")
    .trim();
  return CITY_COORDS[base] ?? null;
}

type Coords = { lat: number; lng: number };

// Cache mémoire du géocodage distant (y compris les échecs, pour ne pas
// réinterroger l'API à chaque cycle d'ingestion sur les mêmes villes).
const remoteCache = new Map<string, { coords: Coords | null; at: number }>();
// Requêtes en vol : avec l'ingestion parallèle, dix offres de la même ville
// arrivent ensemble. Sans cette table, on lancerait dix appels identiques.
const inFlight = new Map<string, Promise<Coords | null>>();

/**
 * Géocodage complet : table statique d'abord, puis l'API officielle
 * adresse.data.gouv.fr (gratuite, sans clé) pour les communes de périphérie
 * (Blagnac, Issy-les-Moulineaux…). Indispensable à la recherche « à moins de
 * X km » : sans coordonnées, une offre est invisible pour le filtre géo.
 *
 * Les appels distants passent par la couche HTTP commune (retry, backoff,
 * throttle) et sont dédupliqués par ville, y compris entre appels concurrents.
 */
export async function geocodeCityFull(city: string): Promise<Coords | null> {
  const local = geocodeCity(city);
  if (local) return local;
  if (!city) return null;

  const key = stripAccents(city).toLowerCase().trim();
  const cached = remoteCache.get(key);
  if (cached && Date.now() - cached.at < (cached.coords ? 30 * 86400000 : 5 * 60000)) return cached.coords;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = geocodeRemote(city)
    .then((coords) => {
      remoteCache.set(key, { coords, at: Date.now() });
      return coords;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

async function geocodeRemote(city: string): Promise<Coords | null> {
  const url = new URL("https://geo.api.gouv.fr/communes");
  url.searchParams.set("nom", city.replace(/\s*\(?\d{2,5}\)?\s*$/, "").trim());
  url.searchParams.set("fields", "nom,centre");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "1");

  try {
    const json = await fetchJson<Array<{ nom: string; centre?: { coordinates?: [number, number] } }>>(url, { timeoutMs: 4_000, retries: 0, minIntervalMs: 80, cacheTtlMs: 30 * 86400000 });
    const exact = json?.find((entry) => stripAccents(entry.nom).toLowerCase() === stripAccents(city.replace(/\s*\(?\d{2,5}\)?\s*$/, "").trim()).toLowerCase());
    const c = exact?.centre?.coordinates;
    if (c && c.length === 2) return { lat: c[1], lng: c[0] };
  } catch {
    // API coupée par le disjoncteur : on renvoie null, retenté au prochain cycle.
  }
  return null;
}

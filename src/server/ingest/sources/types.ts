import type { RawOffer } from "@/server/ingest/normalize";

/**
 * Une source d'offres réelles (job board, API publique, API partenaire).
 * `fetchOffers` renvoie des offres brutes prêtes pour `processIngest`, qui se
 * charge de la normalisation, de la déduplication et du rejet hors périmètre
 * (seuls stage et alternance sont conservés).
 */
export interface SourceConnector {
  /** Domaine identifiant la source (ex. "francetravail.fr"), stocké sur l'offre. */
  readonly sourceSite: string;
  /** Nom lisible pour les logs. */
  readonly label: string;
  /** True si la source est configurée (clés présentes) et peut être appelée. */
  isEnabled(): boolean;
  /** Récupère les offres brutes de stage / alternance tech en France. */
  fetchOffers(): Promise<RawOffer[]>;
}

/** Secteurs tech ciblés — sert d'étiquette `sector` par défaut. */
export const TECH_SECTOR = "Tech / Informatique";

/**
 * Métiers tech couverts par le scraping. Combinés avec « stage » et
 * « alternance » pour maximiser le volume d'offres récupérées sur chaque source.
 */
export const TECH_KEYWORDS = [
  "développeur",
  "développeur web",
  "développeur full stack",
  "développeur frontend",
  "développeur backend",
  "développeur mobile",
  "ingénieur logiciel",
  "data",
  "data engineer",
  "data analyst",
  "data science",
  "intelligence artificielle",
  "machine learning",
  "devops",
  "cloud",
  "cybersécurité",
  "réseau informatique",
  "administrateur systèmes",
  "test qa",
  "product manager",
  "ux ui designer",
  "informatique",
  "blockchain",
  "sre",
] as const;

/** Génère les requêtes « stage <métier> » et « alternance <métier> ». */
export function techQueries(): string[] {
  const queries: string[] = [];
  for (const kw of TECH_KEYWORDS) {
    queries.push(`stage ${kw}`, `alternance ${kw}`);
  }
  return queries;
}

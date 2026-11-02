import { htmlToText } from "./html-to-text";
/**
 * Extraction des annonces au format **schema.org `JobPosting`** (JSON-LD).
 *
 * De nombreux job boards publient leurs offres dans un bloc
 * `<script type="application/ld+json">` — c'est ce que consomme Google for
 * Jobs. C'est la cible de parsing la plus robuste qui soit : un format
 * standardisé et stable, là où le HTML change au gré des refontes. Un
 * connecteur bâti là-dessus survit aux redesigns.
 *
 * Deux pièges du terrain traités ici :
 * 1. certains sites laissent des **caractères de contrôle bruts** (retours à la
 *    ligne, tabulations) à l'intérieur des chaînes JSON, ce qui fait échouer
 *    `JSON.parse` — on les échappe avant de réessayer ;
 * 2. le `JobPosting` peut être imbriqué dans un `@graph` ou un tableau.
 */

export type JsonLdJobPosting = {
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string | string[];
  educationRequirements?: unknown;
  hiringOrganization?: { name?: string; logo?: unknown };
  jobLocation?: unknown;
  jobLocationType?: string;
  baseSalary?: unknown;
  skills?: string | string[];
};

const SCRIPT_RE = /<script[^>]+type=["']application\/ld(?:\+|&#x0*2b;|&#0*43;|&plus;)json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Échappe les caractères de contrôle présents **à l'intérieur des chaînes**
 * JSON, en laissant intacts ceux qui séparent les jetons (indentation, sauts de
 * ligne de mise en forme). Un simple `replace` global casserait le document.
 */
function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      out += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }
    if (inString && char < " ") {
      out += char === "\n" ? "\\n" : char === "\r" ? "\\r" : char === "\t" ? "\\t" : " ";
      continue;
    }
    out += char;
  }

  return out;
}

function parseLenient(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(escapeControlCharsInStrings(raw));
    } catch {
      return null;
    }
  }
}

function isJobPosting(value: unknown): value is JsonLdJobPosting {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { "@type"?: unknown })["@type"];
  return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
}

/** Parcourt tableaux et `@graph` à la recherche du premier `JobPosting`. */
function findJobPosting(node: unknown): JsonLdJobPosting | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  if (isJobPosting(node)) return node;

  const graph = (node as { "@graph"?: unknown })["@graph"];
  return graph ? findJobPosting(graph) : null;
}

/** Renvoie le premier `JobPosting` trouvé dans la page, ou `null`. */
export function extractJobPosting(html: string): JsonLdJobPosting | null {
  SCRIPT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    const found = findJobPosting(parseLenient(match[1].trim()));
    if (found) return found;
  }
  return null;
}

/** Ville de l'annonce : `jobLocation.address.addressLocality` (premier lieu). */
export function jobLocationCity(posting: JsonLdJobPosting): string | null {
  const location = Array.isArray(posting.jobLocation)
    ? posting.jobLocation[0]
    : posting.jobLocation;
  if (typeof location !== "object" || location === null) return null;
  const address = (location as { address?: unknown }).address;
  if (typeof address !== "object" || address === null) return null;
  const locality = (address as { addressLocality?: unknown }).addressLocality;
  return typeof locality === "string" && locality.trim() ? locality.trim() : null;
}

/** Code pays de l'annonce, normalisé en majuscules (`"FR"`), ou `null`. */
export function jobLocationCountry(posting: JsonLdJobPosting): string | null {
  const location = Array.isArray(posting.jobLocation)
    ? posting.jobLocation[0]
    : posting.jobLocation;
  if (typeof location !== "object" || location === null) return null;
  const address = (location as { address?: unknown }).address;
  if (typeof address !== "object" || address === null) return null;
  const country = (address as { addressCountry?: unknown }).addressCountry;
  if (typeof country === "string") return country.trim().toUpperCase();
  if (typeof country === "object" && country !== null) {
    const name = (country as { name?: unknown }).name;
    if (typeof name === "string") return name.trim().toUpperCase();
  }
  return null;
}

/**
 * `employmentType` schema.org → vocabulaire de `normalize.ts`.
 * `INTERN` couvre le stage ; l'alternance n'a pas de code normalisé, les sites
 * français y mettent le libellé en clair (« Alternance », « Apprentissage »).
 */
export function employmentContractType(posting: JsonLdJobPosting): string | null {
  const types = Array.isArray(posting.employmentType)
    ? posting.employmentType
    : [posting.employmentType];
  const joined = types
    .filter((t): t is string => typeof t === "string")
    .join(" ")
    .toLowerCase();
  if (!joined) return null;
  if (/altern|apprenti/.test(joined)) return "alternance";
  if (/intern|stage|stagiaire/.test(joined)) return "stage";
  return null;
}

/** Balises HTML retirées du texte de description fourni par le JSON-LD. */
export function jsonLdText(html: string): string {
  return htmlToText(html);
}

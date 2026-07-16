import { createHash } from "crypto";

/**
 * Normalisation d'un champ pour la déduplication :
 * minuscules, accents supprimés (NFD), ponctuation supprimée, espaces réduits.
 */
export function normalizeForDedup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hash de déduplication d'une offre : SHA-256 de titre|entreprise|ville normalisés.
 * Deux offres au libellé équivalent (casse, accents, ponctuation) produisent le même hash.
 */
export function computeDedupHash(title: string, companyName: string, city: string): string {
  const key = [
    normalizeForDedup(title),
    normalizeForDedup(companyName),
    normalizeForDedup(city),
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

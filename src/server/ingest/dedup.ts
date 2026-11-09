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
export function canonicalOfferUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_|^(?:gh_src|source|trackingId|refId|trk|tracking|from|ref)$/i.test(key))
      url.searchParams.delete(key);
  }
  url.searchParams.sort();
  const linkedInId = /\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/.exec(url.pathname)?.[1];
  if (/(^|\.)linkedin\.com$/.test(url.hostname) && linkedInId)
    return `https://www.linkedin.com/jobs/view/${linkedInId}/`;
  // Le même numéro de réquisition Workday peut être publié dans plusieurs langues.
  const workdayId = /_((?:JR|R)\d+)(?:-\d+)?(?:[/?]|$)/i.exec(url.pathname)?.[1];
  if (/\.myworkdayjobs\.com$/.test(url.hostname) && workdayId)
    return `${url.origin}/requisition/${workdayId.toUpperCase()}`;
  return url.href.replace(/\/$/, "");
}

export function computeDedupHash(
  title: string,
  companyName: string,
  city: string,
  sourceUrl?: string,
): string {
  if (sourceUrl)
    return createHash("sha256")
      .update(`url|${canonicalOfferUrl(sourceUrl)}`)
      .digest("hex");
  const key = [
    normalizeForDedup(title),
    normalizeForDedup(companyName),
    normalizeForDedup(city),
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

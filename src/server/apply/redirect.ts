/**
 * Logique métier du bouton « Postuler » (/go/:offerId).
 * Extraite du route handler pour être testable unitairement.
 */

export type ApplyOffer = {
  id: string;
  slug: string;
  status: "ACTIVE" | "EXPIRED" | "UNCERTAIN";
  sourceUrl: string;
};

export type ApplyDeps = {
  findOffer: (offerId: string) => Promise<ApplyOffer | null>;
  recordClick: (data: {
    offerId: string;
    userId: string | null;
    referer: string | null;
  }) => Promise<void>;
};

export type ApplyResolution =
  { kind: "redirect"; url: string } | { kind: "expired"; slug: string } | { kind: "not_found" };

/**
 * (1) vérifie que l'offre est active, (2) enregistre le clic,
 * (3) renvoie l'URL source pour un 302. Une offre expirée renvoie
 * vers la page « Offre expirée » ; le clic n'est alors PAS compté.
 */
export async function resolveApply(
  deps: ApplyDeps,
  offerId: string,
  userId: string | null,
  referer: string | null,
): Promise<ApplyResolution> {
  const offer = await deps.findOffer(offerId);
  if (!offer) return { kind: "not_found" };

  if (offer.status === "EXPIRED") {
    return { kind: "expired", slug: offer.slug };
  }

  try { const url = new URL(offer.sourceUrl); if (!["https:", "http:"].includes(url.protocol)) return { kind: "not_found" }; } catch { return { kind: "not_found" }; }
  await deps.recordClick({ offerId: offer.id, userId, referer });
  return { kind: "redirect", url: offer.sourceUrl };
}

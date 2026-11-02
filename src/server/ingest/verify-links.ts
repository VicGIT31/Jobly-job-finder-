import { prisma } from "@/lib/prisma";
import { syncOffersToSearch } from "@/server/search/sync";
import { mapPool } from "./http";
/** Bounded, uncached checks. A refused request is not evidence of expiration. */
export async function verifyKnownOfferLinks(limit = 30) {
  const offers = await prisma.jobOffer.findMany({ where: { universe: { in: ["COMMERCE", "ASV"] }, status: { in: ["ACTIVE", "UNCERTAIN"] }, OR: [{ linkCheckedAt: null }, { linkCheckedAt: { lt: new Date(Date.now() - 7 * 86400000) } }] }, include: { company: true }, orderBy: [{ linkCheckedAt: { sort: "asc", nulls: "first" } }, { lastSeenAt: "desc" }], take: limit });
  const results = await mapPool(offers, 3, async (offer) => {
    const target = new URL(offer.sourceUrl);
    // Only known public providers; never fetch private/local URLs from an import.
    if (target.protocol !== "https:" || !/(^|\.)(anicura\.fr|recrutement-monveto\.com|sevetys\.fr|francetravail\.fr|smartrecruiters\.com|hellowork\.com|argos-veterinaire\.com)$/.test(target.hostname)) return null;
    let status: number | null = null;
    try { const response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Jobly/0.3 (personal public job search)" }, cache: "no-store" }); status = response.status; await response.body?.cancel(); } catch { /* Connection failure is uncertain, never a confirmed expiration. */ }
    const expired = status === 404 || status === 410;
    const uncertain = status == null || status >= 400;
    const originStatus = expired ? "EXPIRED" : uncertain ? "UNCERTAIN" : "ACTIVE";
    await prisma.offerOrigin.updateMany({ where: { offerId: offer.id, sourceUrl: offer.sourceUrl }, data: { status: originStatus } });
    const alternate = expired || uncertain ? await prisma.offerOrigin.findFirst({ where: { offerId: offer.id, sourceUrl: { not: offer.sourceUrl }, status: "ACTIVE" }, orderBy: { lastVerifiedAt: "desc" } }) : null;
    const updated = await prisma.jobOffer.update({ where: { id: offer.id }, data: { linkCheckedAt: new Date(), linkStatus: status, ...(alternate ? { sourceUrl: alternate.sourceUrl, sourceSite: alternate.sourceSite, status: "ACTIVE" } : { status: expired ? "EXPIRED" : uncertain ? "UNCERTAIN" : offer.status }) }, include: { company: true } });
    await syncOffersToSearch([updated]).catch(() => {});
    return { id: offer.id, status, state: updated.status };
  });
  return { checked: results.length, expired: results.filter((result) => result.state === "EXPIRED").length, uncertain: results.filter((result) => result.state === "UNCERTAIN").length };
}

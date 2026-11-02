import type { OfferDocument } from "./sync";
import { distanceKm, type Point } from "@/lib/geo";
import { FAMILY_LABELS, fold } from "@/lib/job-taxonomy";

export function rankOffer(offer: OfferDocument, context: { center: Point | null; radius?: number; query: string; families: string[]; now?: number }) {
  const now = context.now ?? Date.now(), distance = context.center && offer._geo ? distanceKm(context.center, offer._geo) : null;
  const ageDays = Math.max(0, (now - (offer.verifiedAtTs ?? 0)) / 86400000);
  const reasons = [FAMILY_LABELS[offer.jobFamily ?? "OTHER"] ?? "Métier recherché"];
  let score = 40;
  if (context.families.includes(offer.jobFamily ?? "")) { score += 20; reasons.push("Métier correspondant à la recherche"); }
  if (distance != null) { score += 25 * Math.max(0, 1 - distance / Math.max(context.radius ?? 100, 1)); reasons.push(`${Math.round(distance)} km environ du centre de recherche`); }
  else if (context.center) reasons.push("Distance inconnue");
  score += 15 * Math.max(0, 1 - ageDays / 7);
  if (ageDays < 1) reasons.push("Annonce vérifiée dans les dernières 24 h");
  if (context.query && fold(offer.title).includes(fold(context.query))) { score += 10; reasons.push("Intitulé correspondant"); }
  if (offer.status === "UNCERTAIN") { score -= 20; reasons.push("Disponibilité à confirmer"); }
  return { ...offer, score: Math.round(score * 10) / 10, distanceKm: distance == null ? null : Math.round(distance * 10) / 10, reasons };
}

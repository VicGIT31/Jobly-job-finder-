import type { OfferDocument } from "./sync";
import { distanceKm, type Point } from "@/lib/geo";
import { FAMILY_LABELS, fold } from "@/lib/job-taxonomy";
import { SPECIALTY_LABELS } from "@/lib/search-params";

export type RankContext = {
  center: Point | null;
  radius?: number;
  query: string;
  /** Métiers demandés explicitement ou déduits d'une recherche connue (« ASV », « commercial »). */
  families: string[];
  specialties: string[];
  now?: number;
};

const DAY = 86_400_000;
const days = (value: number) => Math.round(value);

/**
 * Classement explicable, de 0 à ~110 : chaque point vient d'une raison affichée.
 *
 * - métier recherché (+20) et confiance du classement (+6) ;
 * - proximité (+25), calculée sur la vraie distance ;
 * - nouveauté (+15 max) : date de publication si elle est connue, sinon date de
 *   première détection, plus faible. La dernière vérification ne sert jamais de
 *   nouveauté (elle est remise à jour à chaque collecte) : elle ne fait que
 *   pénaliser une annonce qu'on ne revoit plus ;
 * - pertinence textuelle Meilisearch (+12) et intitulé identique à la requête (+6).
 */
export function rankOffer(offer: OfferDocument, context: RankContext) {
  const now = context.now ?? Date.now();
  const distance = context.center && offer._geo ? distanceKm(context.center, offer._geo) : null;
  const reasons: string[] = [];
  let score = 40;

  const jobFamily = offer.jobFamily ?? "OTHER";
  const familyMatch =
    context.families.includes(jobFamily) || context.specialties.includes(offer.specialty);
  const label =
    offer.universe === "TECH" && offer.specialty !== "AUTRE"
      ? (SPECIALTY_LABELS[offer.specialty as keyof typeof SPECIALTY_LABELS] ?? FAMILY_LABELS.TECH)
      : (FAMILY_LABELS[jobFamily] ?? "Métier recherché");
  reasons.push(label);
  if (familyMatch) {
    score += 20;
    reasons.push("Métier correspondant à la recherche");
  }
  if (offer.universe !== "TECH") {
    score += 6 * (offer.jobConfidence ?? 0.9);
    reasons.push(...(offer.jobEvidence ?? []).slice(0, 2));
  }

  if (distance != null) {
    score += 25 * Math.max(0, 1 - distance / Math.max(context.radius ?? 100, 1));
    reasons.push(`${Math.round(distance)} km environ du centre de recherche`);
  } else if (context.center) reasons.push("Distance inconnue");

  if (offer.publicationKnown) {
    const age = Math.max(0, (now - offer.publishedAtTs) / DAY);
    score += 15 * Math.max(0, 1 - age / 21);
    if (age < 1) reasons.push("Publiée dans les dernières 24 h");
    else if (age <= 7) reasons.push(`Publiée il y a ${days(age)} j`);
  } else {
    const age = Math.max(0, (now - (offer.firstSeenAtTs ?? offer.publishedAtTs)) / DAY);
    score += 8 * Math.max(0, 1 - age / 7);
    if (age < 1) reasons.push("Détectée dans les dernières 24 h (publication non précisée)");
  }
  const unseen = Math.max(0, (now - (offer.verifiedAtTs ?? now)) / DAY);
  if (unseen > 7) {
    score -= 10;
    reasons.push(`Plus revue depuis ${days(unseen)} jours`);
  }

  if (context.query) {
    score += 12 * (offer._rankingScore ?? 0);
    if (fold(offer.title).includes(fold(context.query))) {
      score += 6;
      reasons.push("Intitulé correspondant");
    }
  }
  if (offer.status === "UNCERTAIN") {
    score -= 20;
    reasons.push("Disponibilité à confirmer");
  }

  return {
    ...offer,
    score: Math.round(score * 10) / 10,
    distanceKm: distance == null ? null : Math.round(distance * 10) / 10,
    reasons: [...new Set(reasons)].slice(0, 6),
  };
}

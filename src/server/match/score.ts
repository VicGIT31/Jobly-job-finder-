/**
 * Score de correspondance transparent (`Match` sur la page offre).
 * Règles simples et explicables — pas d'IA, pas de pourcentage magique.
 * Un facteur n'est compté QUE si le candidat a renseigné la préférence
 * correspondante : mieux vaut un score partiel honnête qu'une fausse
 * certitude à 100 % construite sur des champs vides.
 */
import type { EducationLevel, RemotePolicy, TechSpecialty } from "@prisma/client";
import { normalizeForDedup } from "@/server/ingest/dedup";

const EDUCATION_RANK: Record<Exclude<EducationLevel, "INDIFFERENT">, number> = {
  BAC: 1,
  BAC_2: 2,
  BAC_3: 3,
  BAC_5: 4,
  DOCTORAT: 5,
};

export type MatchCandidate = {
  educationLevel: EducationLevel | null;
  targetSpecialty: TechSpecialty | null;
  city: string | null;
};

export type MatchOffer = {
  educationLevel: EducationLevel;
  specialty: TechSpecialty;
  city: string;
  remotePolicy: RemotePolicy;
};

export type MatchFactor = {
  key: "education" | "specialty" | "location";
  label: string;
  score: number; // 0-100
  explanation: string;
};

export type MatchResult = {
  score: number; // 0-100, moyenne des facteurs présents
  factors: MatchFactor[];
};

/** Palier lisible d'un score de correspondance — partagé entre les composants qui l'affichent. */
export function scoreTier(score: number): { label: string; className: string } {
  if (score >= 85)
    return { label: "Très bon match", className: "text-emerald-700 dark:text-emerald-400" };
  if (score >= 65) return { label: "Bon match", className: "text-cobalt" };
  if (score >= 40)
    return { label: "Match partiel", className: "text-amber-700 dark:text-amber-400" };
  return { label: "Match faible", className: "text-ink/60" };
}

function educationFactor(
  candidateLevel: EducationLevel | null,
  requiredLevel: EducationLevel,
): MatchFactor | null {
  if (requiredLevel === "INDIFFERENT") {
    return {
      key: "education",
      label: "Formation",
      score: 100,
      explanation: "Aucun niveau d'études requis pour cette offre.",
    };
  }
  if (candidateLevel === null || candidateLevel === "INDIFFERENT") return null;

  const candidateRank = EDUCATION_RANK[candidateLevel];
  const requiredRank = EDUCATION_RANK[requiredLevel];
  const gap = requiredRank - candidateRank;

  if (gap <= 0) {
    return {
      key: "education",
      label: "Formation",
      score: 100,
      explanation: "Vous atteignez le niveau d'études demandé.",
    };
  }
  const score = Math.max(0, 100 - gap * 30);
  return {
    key: "education",
    label: "Formation",
    score,
    explanation: `Niveau demandé légèrement supérieur au vôtre (écart de ${gap} palier${gap > 1 ? "s" : ""}).`,
  };
}

function specialtyFactor(
  candidateSpecialty: TechSpecialty | null,
  offerSpecialty: TechSpecialty,
): MatchFactor | null {
  if (candidateSpecialty === null || offerSpecialty === "AUTRE") return null;

  const match = candidateSpecialty === offerSpecialty;
  return {
    key: "specialty",
    label: "Spécialité",
    score: match ? 100 : 25,
    explanation: match
      ? "Correspond à la spécialité que vous recherchez."
      : "Spécialité différente de celle que vous recherchez.",
  };
}

function locationFactor(candidateCity: string | null, offer: MatchOffer): MatchFactor | null {
  if (offer.remotePolicy === "FULL") {
    return {
      key: "location",
      label: "Localisation",
      score: 100,
      explanation: "Poste en télétravail intégral : la localisation n'est pas un frein.",
    };
  }
  if (candidateCity === null || candidateCity.trim() === "") return null;

  const sameCity = normalizeForDedup(candidateCity) === normalizeForDedup(offer.city);
  if (sameCity) {
    return {
      key: "location",
      label: "Localisation",
      score: 100,
      explanation: "Ville qui correspond à votre préférence.",
    };
  }
  if (offer.remotePolicy === "HYBRID") {
    return {
      key: "location",
      label: "Localisation",
      score: 50,
      explanation: `Hybride à ${offer.city} : à prévoir des déplacements depuis votre ville.`,
    };
  }
  return {
    key: "location",
    label: "Localisation",
    score: 20,
    explanation: `Poste sur site à ${offer.city}, différent de votre ville.`,
  };
}

/**
 * Calcule le score de correspondance. Retourne `null` si le profil ne
 * contient aucune des préférences nécessaires (rien à comparer).
 */
export function computeMatchScore(
  candidate: MatchCandidate,
  offer: MatchOffer,
): MatchResult | null {
  const factors = [
    educationFactor(candidate.educationLevel, offer.educationLevel),
    specialtyFactor(candidate.targetSpecialty, offer.specialty),
    locationFactor(candidate.city, offer),
  ].filter((f): f is MatchFactor => f !== null);

  if (factors.length === 0) return null;

  const score = Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length);
  return { score, factors };
}

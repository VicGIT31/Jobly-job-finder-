import type { Tone } from "@/server/ai/provider";

/**
 * Séparé de `actions.ts` : un fichier `"use server"` ne peut exporter que des
 * fonctions async (Server Actions) — exporter des constantes comme celles-ci
 * depuis un fichier `"use server"` casse au runtime dès qu'un composant
 * client les consomme réellement (`AI_TONES.map` reçoit une référence
 * d'action, pas le tableau). Trouvé en vérifiant `AiDraftPanel` en conditions
 * réelles, connecté (jamais testé authentifié avant : erreur 500 sur
 * `/offres/[slug]` pour tout utilisateur connecté).
 */
export const AI_TONES: readonly Tone[] = [
  "concise",
  "professional",
  "enthusiastic",
  "technical",
  "conversational",
];

export const AI_TONE_LABELS: Record<Tone, string> = {
  concise: "Concis",
  professional: "Professionnel",
  enthusiastic: "Enthousiaste",
  technical: "Technique",
  conversational: "Naturel",
};

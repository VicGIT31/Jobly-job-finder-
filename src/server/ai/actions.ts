"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPECIALTY_LABELS } from "@/lib/search-params";
import { getAiProvider } from "@/server/ai";
import { AiProviderError, type Tone } from "@/server/ai/provider";

export type GenerateAnswerResult =
  | { ok: true; text: string; isRealAi: boolean; providerName: string }
  | { ok: false; error: string };

const MAX_QUESTION_LENGTH = 500;
const DESCRIPTION_EXCERPT_LENGTH = 600;

function specialtyLabel(specialty: string | null): string | null {
  if (!specialty) return null;
  return (SPECIALTY_LABELS as Record<string, string>)[specialty] ?? null;
}

/**
 * Génère un brouillon de réponse de candidature (spec §19, §41). Retourne
 * toujours `isRealAi` : l'UI ne doit jamais afficher un brouillon gabarit
 * (`MockProvider`) sous un libellé « généré par IA » (spec §56).
 */
export async function generateApplicationAnswer(
  offerId: string,
  question: string,
  tone: Tone,
): Promise<GenerateAnswerResult> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return { ok: false, error: "Connexion requise." };

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return { ok: false, error: "Précisez une question ou une consigne." };
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: "Question trop longue (500 caractères max)." };
  }

  const [user, offer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, headline: true, school: true, city: true, targetSpecialty: true },
    }),
    prisma.jobOffer.findUnique({
      where: { id: offerId },
      select: { title: true, description: true, company: { select: { name: true } } },
    }),
  ]);

  if (!offer) return { ok: false, error: "Offre introuvable." };

  const provider = getAiProvider();

  try {
    const text = await provider.generateApplicationAnswer({
      question: trimmedQuestion,
      tone,
      profile: {
        name: user?.name ?? null,
        headline: user?.headline ?? null,
        school: user?.school ?? null,
        city: user?.city ?? null,
        targetSpecialtyLabel: specialtyLabel(user?.targetSpecialty ?? null),
      },
      job: {
        title: offer.title,
        companyName: offer.company.name,
        descriptionExcerpt: offer.description.slice(0, DESCRIPTION_EXCERPT_LENGTH),
      },
    });
    return { ok: true, text, isRealAi: provider.isRealAi, providerName: provider.name };
  } catch (cause) {
    const message =
      cause instanceof AiProviderError
        ? "Le service IA est momentanément indisponible. Réessayez plus tard."
        : "Une erreur inattendue est survenue.";
    return { ok: false, error: message };
  }
}

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

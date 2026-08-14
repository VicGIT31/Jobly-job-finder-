import type { AiProvider, GenerateAnswerInput } from "./provider";

const TONE_OPENERS: Record<GenerateAnswerInput["tone"], string> = {
  concise: "Je suis intéressé·e par ce poste chez",
  professional: "Je vous soumets ma candidature avec beaucoup d'intérêt pour ce poste chez",
  enthusiastic: "C'est avec un vif enthousiasme que je candidate pour ce poste chez",
  technical: "Fort·e de mon expérience technique, je souhaite rejoindre",
  conversational: "J'ai vu cette offre et elle m'a tout de suite donné envie de postuler chez",
};

/**
 * Gabarit déterministe, sans appel réseau — utilisé quand aucun fournisseur
 * IA réel n'est configuré (`isEnabled()` d'un provider réel = false).
 * `isRealAi = false` : les composants ne doivent jamais afficher ce
 * résultat sous un libellé « généré par IA » (spec §56).
 *
 * N'invente rien : ne mentionne que ce qui est explicitement dans
 * `ProfileContext` (headline, école, ville, spécialité) — jamais de projet,
 * technologie ou réalisation non fournie (spec §19 : « The AI must never
 * fabricate »).
 */
export class MockProvider implements AiProvider {
  readonly name = "mock";
  readonly isRealAi = false;

  isEnabled(): boolean {
    return true; // Toujours disponible : c'est le repli garanti.
  }

  async generateApplicationAnswer(input: GenerateAnswerInput): Promise<string> {
    const { profile, job, tone } = input;
    const opener = TONE_OPENERS[tone];

    const background = [
      profile.headline ? `en tant que ${profile.headline.toLowerCase()}` : null,
      profile.school ? `formé·e à ${profile.school}` : null,
      profile.targetSpecialtyLabel
        ? `orienté·e ${profile.targetSpecialtyLabel.toLowerCase()}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    const locationLine =
      profile.city && job.title
        ? ` Basé·e à ${profile.city}, je suis disponible pour ce poste.`
        : "";

    return [
      `${opener} ${job.companyName}, pour le poste de ${job.title}.`,
      background ? `Je suis ${background}.` : null,
      `Ce poste correspond à ce que je recherche actuellement, et je serais ravi·e d'échanger sur la façon dont je peux contribuer à votre équipe.${locationLine}`,
      "",
      "[Brouillon à personnaliser — complétez avec un exemple concret de votre expérience en lien avec cette offre.]",
    ]
      .filter((line) => line !== null)
      .join("\n");
  }
}

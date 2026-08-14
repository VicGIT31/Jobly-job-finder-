/**
 * Abstraction de fournisseur IA (spec §41, §69 : « build the integration
 * abstraction; implement a development adapter/mock; clearly mark the
 * required environment variable; keep the rest of the feature functional;
 * do not pretend the external call succeeded »).
 *
 * Aucune clé n'est configurée dans ce dépôt (voir CONTEXTE_AI_WORK.md) :
 * `getAiProvider()` retombe sur `MockProvider`, dont la sortie n'est
 * JAMAIS présentée comme « générée par IA » dans l'UI (spec §56 : « "AI"
 * labels with no AI » est un piège explicitement interdit) — voir
 * `isRealAi` ci-dessous, que les composants doivent lire avant d'afficher
 * un libellé « IA ».
 */

export type Tone = "concise" | "professional" | "enthusiastic" | "technical" | "conversational";

export type ProfileContext = {
  name: string | null;
  headline: string | null;
  school: string | null;
  city: string | null;
  targetSpecialtyLabel: string | null;
};

export type JobContext = {
  title: string;
  companyName: string;
  descriptionExcerpt: string;
};

export type GenerateAnswerInput = {
  question: string;
  tone: Tone;
  profile: ProfileContext;
  job: JobContext;
};

export interface AiProvider {
  readonly name: string;
  /** true = appel réel à un modèle ; false = gabarit déterministe (MockProvider). */
  readonly isRealAi: boolean;
  isEnabled(): boolean;
  generateApplicationAnswer(input: GenerateAnswerInput): Promise<string>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

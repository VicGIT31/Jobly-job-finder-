/**
 * Abstraction des brouillons de candidature. Sans ANTHROPIC_API_KEY,
 * `getAiProvider()` utilise le gabarit déterministe `MockProvider`.
 * Les composants vérifient `isRealAi` avant d'afficher un libellé « IA » ;
 * une erreur d'appel réel doit rester explicite. Configuration et limites :
 * docs/v0.5.0/ANALYSE.md et README.md.
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

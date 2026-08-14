import type { AiProvider } from "./provider";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";

const anthropicProvider = new AnthropicProvider();
const mockProvider = new MockProvider();

/**
 * Sélecteur de fournisseur IA : identique au motif `SourceConnector` déjà
 * utilisé pour les connecteurs de sources d'offres (`isEnabled()` décide).
 * `MockProvider.isEnabled()` renvoie toujours `true` : c'est le repli
 * garanti quand `ANTHROPIC_API_KEY` n'est pas configurée.
 */
export function getAiProvider(): AiProvider {
  if (anthropicProvider.isEnabled()) return anthropicProvider;
  return mockProvider;
}

export type { AiProvider, GenerateAnswerInput, JobContext, ProfileContext, Tone } from "./provider";
export { AiProviderError } from "./provider";

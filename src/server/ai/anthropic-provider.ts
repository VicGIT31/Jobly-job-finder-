import { AiProviderError, type AiProvider, type GenerateAnswerInput } from "./provider";

/**
 * Appel direct à l'API Messages d'Anthropic (fetch, pas de SDK — dépendance
 * minimale pour une seule fonctionnalité). Modèle Haiku : brouillon court et
 * cadré, pas de raisonnement complexe requis — coût maîtrisé pour une
 * fonctionnalité gratuite du site.
 *
 * `isEnabled() === false` (pas de clé) → le sélecteur retombe sur
 * `MockProvider`, jamais d'appel réseau silencieusement ignoré. Un appel
 * réel qui échoue lève `AiProviderError` : on ne prétend jamais que l'appel
 * a réussi (spec §69).
 */
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const TONE_INSTRUCTIONS: Record<GenerateAnswerInput["tone"], string> = {
  concise: "Ton concis : phrases courtes, va droit au but, pas de fioritures.",
  professional: "Ton professionnel et formel, vouvoiement soutenu.",
  enthusiastic: "Ton enthousiaste et motivé, sans être excessif ni familier.",
  technical: "Ton technique, met en avant la rigueur et les compétences précises.",
  conversational:
    "Ton naturel et conversationnel, comme un message écrit avec soin mais sans jargon RH.",
};

function buildSystemPrompt(): string {
  return [
    "Tu aides un·e candidat·e à rédiger un brouillon de réponse pour une candidature à un stage ou une alternance en France.",
    "Règle absolue : n'invente JAMAIS d'expérience, de compétence, de projet ou de diplôme qui ne t'a pas été fourni explicitement dans le profil du candidat. Si une information manque, formule une phrase générique plutôt que de la deviner.",
    "N'invente aucun fait sur l'entreprise ou l'offre au-delà de ce qui est fourni.",
    'Réponds uniquement en français, sans préambule ni méta-commentaire ("Voici un brouillon :" est interdit) — donne directement le texte du brouillon.',
    "Le texte final doit rester un brouillon à personnaliser : reste générique sur les réalisations concrètes, le candidat les complètera lui-même.",
  ].join("\n");
}

function buildUserPrompt(input: GenerateAnswerInput): string {
  const { question, tone, profile, job } = input;
  const profileLines = [
    profile.name ? `Nom : ${profile.name}` : null,
    profile.headline ? `Intitulé / poste recherché : ${profile.headline}` : null,
    profile.school ? `École / formation : ${profile.school}` : null,
    profile.city ? `Ville : ${profile.city}` : null,
    profile.targetSpecialtyLabel ? `Spécialité visée : ${profile.targetSpecialtyLabel}` : null,
  ].filter(Boolean);

  return [
    `Offre : ${job.title} chez ${job.companyName}.`,
    job.descriptionExcerpt ? `Extrait de l'offre : ${job.descriptionExcerpt}` : null,
    "",
    profileLines.length > 0
      ? `Profil du candidat (n'utilise que ces informations, n'en invente aucune autre) :\n${profileLines.join("\n")}`
      : "Le candidat n'a renseigné aucune information de profil : reste générique, sans inventer de détails.",
    "",
    `Consigne de ton : ${TONE_INSTRUCTIONS[tone]}`,
    "",
    `Question à laquelle répondre dans le brouillon : ${question}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicMessageResponse = {
  content?: Array<AnthropicTextBlock | { type: string }>;
  stop_reason?: string;
};

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly isRealAi = true;

  isEnabled(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generateApplicationAnswer(input: GenerateAnswerInput): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AiProviderError("ANTHROPIC_API_KEY n'est pas configurée.", this.name);
    }

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 700,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: buildUserPrompt(input) }],
        }),
      });
    } catch (cause) {
      throw new AiProviderError(
        `Appel réseau à l'API Anthropic échoué : ${cause instanceof Error ? cause.message : String(cause)}`,
        this.name,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiProviderError(`API Anthropic a répondu ${response.status} : ${body}`, this.name);
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    if (data.stop_reason === "refusal") {
      throw new AiProviderError(
        "Le modèle a refusé de générer une réponse pour cette demande.",
        this.name,
      );
    }

    const textBlock = data.content?.find(
      (block): block is AnthropicTextBlock => block.type === "text",
    );
    if (!textBlock || !textBlock.text.trim()) {
      throw new AiProviderError("Réponse de l'API Anthropic vide ou inattendue.", this.name);
    }

    return textBlock.text.trim();
  }
}

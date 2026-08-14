import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock-provider";
import type { GenerateAnswerInput } from "./provider";

const baseInput: GenerateAnswerInput = {
  question: "Pourquoi ce poste ?",
  tone: "professional",
  profile: {
    name: "Camille Dupont",
    headline: "Étudiante en développement web",
    school: "EPITECH",
    city: "Lyon",
    targetSpecialtyLabel: "Web",
  },
  job: {
    title: "Stage développeur full-stack",
    companyName: "Acme Corp",
    descriptionExcerpt: "Développement d'une plateforme interne en React et Node.js.",
  },
};

describe("MockProvider", () => {
  it("n'est jamais présenté comme une IA réelle", () => {
    const provider = new MockProvider();
    expect(provider.isRealAi).toBe(false);
    expect(provider.isEnabled()).toBe(true);
  });

  it("inclut le nom de l'entreprise, le poste et un avertissement de brouillon", async () => {
    const provider = new MockProvider();
    const text = await provider.generateApplicationAnswer(baseInput);
    expect(text).toContain("Acme Corp");
    expect(text).toContain("Stage développeur full-stack");
    expect(text).toContain("[Brouillon à personnaliser");
  });

  it("n'invente rien au-delà des informations de profil fournies", async () => {
    const provider = new MockProvider();
    const emptyProfileInput: GenerateAnswerInput = {
      ...baseInput,
      profile: { name: null, headline: null, school: null, city: null, targetSpecialtyLabel: null },
    };
    const text = await provider.generateApplicationAnswer(emptyProfileInput);
    expect(text).not.toMatch(/EPITECH|Lyon|Web/);
    expect(text).toContain("Acme Corp");
  });

  it("adapte l'ouverture au ton demandé", async () => {
    const provider = new MockProvider();
    const concise = await provider.generateApplicationAnswer({ ...baseInput, tone: "concise" });
    const enthusiastic = await provider.generateApplicationAnswer({
      ...baseInput,
      tone: "enthusiastic",
    });
    expect(concise).not.toEqual(enthusiastic);
    expect(enthusiastic).toMatch(/enthousiasme/);
  });
});

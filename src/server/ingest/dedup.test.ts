import { describe, expect, it } from "vitest";
import { computeDedupHash, normalizeForDedup } from "./dedup";

describe("normalizeForDedup", () => {
  it("met en minuscules et supprime les accents", () => {
    expect(normalizeForDedup("Développeur Sénior")).toBe("developpeur senior");
  });

  it("supprime la ponctuation et réduit les espaces", () => {
    expect(normalizeForDedup("  Chef   de projet — CRM !!! ")).toBe("chef de projet crm");
  });

  it("conserve les chiffres", () => {
    expect(normalizeForDedup("Stage 6 mois (2026)")).toBe("stage 6 mois 2026");
  });
});

describe("computeDedupHash", () => {
  it("conserve deux réquisitions différentes malgré le même titre, entreprise et ville", () => {
    expect(
      computeDedupHash(
        "Stage IA",
        "Airbus",
        "Toulouse",
        "https://ag.wd3.myworkdayjobs.com/fr-FR/Airbus/job/Toulouse/Stage-IA_JR12345678",
      ),
    ).not.toBe(
      computeDedupHash(
        "Stage IA",
        "Airbus",
        "Toulouse",
        "https://ag.wd3.myworkdayjobs.com/fr-FR/Airbus/job/Toulouse/Stage-IA_JR87654321",
      ),
    );
  });
  it("rafraîchit la même annonce même si son titre, langue ou suivi change", () => {
    expect(
      computeDedupHash(
        "Stage IA",
        "Airbus",
        "Toulouse",
        "https://ag.wd3.myworkdayjobs.com/fr-FR/Airbus/job/Toulouse/Stage-IA_JR12345678?utm_source=test",
      ),
    ).toBe(
      computeDedupHash(
        "Intern AI",
        "Airbus",
        "Toulouse",
        "https://ag.wd3.myworkdayjobs.com/en-US/Airbus/job/Toulouse/Intern-AI_JR12345678",
      ),
    );
  });
  it("produit le même hash pour deux libellés équivalents", () => {
    const a = computeDedupHash("Développeur Full-Stack", "Doctolib", "Paris");
    const b = computeDedupHash("développeur full stack", "DOCTOLIB", "paris");
    expect(a).toBe(b);
  });

  it("produit des hash différents si la ville change", () => {
    const a = computeDedupHash("Développeur Full-Stack", "Doctolib", "Paris");
    const b = computeDedupHash("Développeur Full-Stack", "Doctolib", "Nantes");
    expect(a).not.toBe(b);
  });

  it("produit des hash différents si l'entreprise change", () => {
    const a = computeDedupHash("Data Analyst", "Swile", "Paris");
    const b = computeDedupHash("Data Analyst", "Qonto", "Paris");
    expect(a).not.toBe(b);
  });

  it("le hash est un SHA-256 hexadécimal", () => {
    expect(computeDedupHash("a", "b", "c")).toMatch(/^[a-f0-9]{64}$/);
  });
});

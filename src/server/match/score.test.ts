import { describe, expect, it } from "vitest";
import { computeMatchScore, type MatchCandidate, type MatchOffer } from "./score";

const baseOffer: MatchOffer = {
  educationLevel: "BAC_5",
  specialty: "WEB",
  city: "Paris",
  remotePolicy: "ONSITE",
};

const emptyCandidate: MatchCandidate = {
  educationLevel: null,
  targetSpecialty: null,
  city: null,
};

describe("computeMatchScore", () => {
  it("retourne null si aucune préférence candidat n'est renseignée et l'offre a des exigences", () => {
    expect(computeMatchScore(emptyCandidate, baseOffer)).toBeNull();
  });

  it("ne retourne jamais null si l'offre est indifférente au niveau ET full remote (facteurs neutres)", () => {
    const result = computeMatchScore(emptyCandidate, {
      ...baseOffer,
      educationLevel: "INDIFFERENT",
      remotePolicy: "FULL",
    });
    expect(result).not.toBeNull();
    expect(result?.score).toBe(100);
  });

  it("formation : 100 si le candidat atteint le niveau demandé", () => {
    const result = computeMatchScore({ ...emptyCandidate, educationLevel: "BAC_5" }, baseOffer);
    expect(result?.factors.find((f) => f.key === "education")?.score).toBe(100);
  });

  it("formation : dépasser le niveau demandé reste 100 (pas de sur-qualification pénalisée)", () => {
    const result = computeMatchScore({ ...emptyCandidate, educationLevel: "DOCTORAT" }, baseOffer);
    expect(result?.factors.find((f) => f.key === "education")?.score).toBe(100);
  });

  it("formation : score dégressif si le candidat est en dessous du niveau demandé", () => {
    const result = computeMatchScore({ ...emptyCandidate, educationLevel: "BAC_3" }, baseOffer);
    expect(result?.factors.find((f) => f.key === "education")?.score).toBe(70);
  });

  it("spécialité : 100 si identique, 25 sinon", () => {
    const match = computeMatchScore({ ...emptyCandidate, targetSpecialty: "WEB" }, baseOffer);
    expect(match?.factors.find((f) => f.key === "specialty")?.score).toBe(100);

    const mismatch = computeMatchScore({ ...emptyCandidate, targetSpecialty: "IA" }, baseOffer);
    expect(mismatch?.factors.find((f) => f.key === "specialty")?.score).toBe(25);
  });

  it("spécialité : ignorée si l'offre n'est pas classée (AUTRE)", () => {
    // Seule préférence renseignée (spécialité) mais offre non classée et
    // aucune autre préférence : aucun facteur ne s'applique → pas de score.
    const result = computeMatchScore(
      { ...emptyCandidate, targetSpecialty: "WEB" },
      { ...baseOffer, specialty: "AUTRE" },
    );
    expect(result).toBeNull();

    // Avec une autre préférence renseignée, le facteur spécialité reste
    // absent mais le score se calcule sur le reste.
    const withCity = computeMatchScore(
      { educationLevel: null, targetSpecialty: "WEB", city: "Paris" },
      { ...baseOffer, specialty: "AUTRE" },
    );
    expect(withCity?.factors.some((f) => f.key === "specialty")).toBe(false);
    expect(withCity?.factors.some((f) => f.key === "location")).toBe(true);
  });

  it("localisation : 100 si même ville (insensible aux accents/casse)", () => {
    const result = computeMatchScore(
      { ...emptyCandidate, city: "  PARIS  " },
      { ...baseOffer, city: "Paris" },
    );
    expect(result?.factors.find((f) => f.key === "location")?.score).toBe(100);
  });

  it("localisation : toujours 100 en full remote même sans ville candidate", () => {
    const result = computeMatchScore(emptyCandidate, { ...baseOffer, remotePolicy: "FULL" });
    expect(result?.factors.find((f) => f.key === "location")?.score).toBe(100);
  });

  it("localisation : score intermédiaire en hybride hors ville candidate", () => {
    const result = computeMatchScore(
      { ...emptyCandidate, city: "Lyon" },
      { ...baseOffer, remotePolicy: "HYBRID" },
    );
    expect(result?.factors.find((f) => f.key === "location")?.score).toBe(50);
  });

  it("localisation : score faible sur site hors ville candidate", () => {
    const result = computeMatchScore(
      { ...emptyCandidate, city: "Lyon" },
      { ...baseOffer, remotePolicy: "ONSITE" },
    );
    expect(result?.factors.find((f) => f.key === "location")?.score).toBe(20);
  });

  it("score global = moyenne des facteurs présents uniquement", () => {
    const result = computeMatchScore(
      { educationLevel: "BAC_5", targetSpecialty: "WEB", city: "Paris" },
      baseOffer,
    );
    // education 100, specialty 100, location 100 → 100
    expect(result?.score).toBe(100);
    expect(result?.factors).toHaveLength(3);
  });
});

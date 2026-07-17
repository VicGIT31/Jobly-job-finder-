import { describe, expect, it } from "vitest";
import { offerMatchesSearch, parseSearchParams, type MatchableOffer } from "./match";

const offer: MatchableOffer = {
  title: "Stage — Growth Marketing",
  description:
    "Pilotez des campagnes d'acquisition B2B à Lyon pour une fintech en hypercroissance.",
  city: "Lyon",
  contractType: "STAGE",
  remotePolicy: "HYBRID",
  educationLevel: "BAC_5",
  sector: "Marketing",
  salaryMin: 1200,
  salaryMax: 1500,
  companyName: "Swile",
};

describe("offerMatchesSearch", () => {
  it("matche sur mot-clé (insensible aux accents et à la casse)", () => {
    expect(offerMatchesSearch({ q: "MARKETING" }, offer)).toBe(true);
    expect(offerMatchesSearch({ q: "acquisition" }, offer)).toBe(true);
    expect(offerMatchesSearch({ q: "comptabilité" }, offer)).toBe(false);
  });

  it("matche « stage marketing lyon » multi-termes", () => {
    expect(offerMatchesSearch({ q: "stage marketing lyon" }, offer)).toBe(true);
  });

  it("filtre par ville", () => {
    expect(offerMatchesSearch({ city: "Lyon" }, offer)).toBe(true);
    expect(offerMatchesSearch({ city: "lyon" }, offer)).toBe(true);
    expect(offerMatchesSearch({ city: "Paris" }, offer)).toBe(false);
  });

  it("filtre par type de contrat (liste)", () => {
    expect(offerMatchesSearch({ contractType: ["STAGE", "ALTERNANCE"] }, offer)).toBe(true);
    expect(offerMatchesSearch({ contractType: ["CDI"] }, offer)).toBe(false);
  });

  it("filtre par salaire minimum", () => {
    expect(offerMatchesSearch({ salaryMin: 1400 }, offer)).toBe(true);
    expect(offerMatchesSearch({ salaryMin: 2000 }, offer)).toBe(false);
  });

  it("exclut les offres sans salaire quand salaryMin est demandé", () => {
    expect(
      offerMatchesSearch({ salaryMin: 1000 }, { ...offer, salaryMin: null, salaryMax: null }),
    ).toBe(false);
  });

  it("combine plusieurs critères (ET logique)", () => {
    expect(offerMatchesSearch({ q: "growth", city: "Lyon", contractType: ["STAGE"] }, offer)).toBe(
      true,
    );
    expect(offerMatchesSearch({ q: "growth", city: "Lyon", contractType: ["CDI"] }, offer)).toBe(
      false,
    );
  });

  it("matche tout quand aucun critère", () => {
    expect(offerMatchesSearch({}, offer)).toBe(true);
  });
});

describe("parseSearchParams", () => {
  it("désérialise un JSON valide", () => {
    expect(
      parseSearchParams({ q: "data", city: "Paris", contractType: ["CDI"], salaryMin: 40000 }),
    ).toEqual({
      q: "data",
      city: "Paris",
      contractType: ["CDI"],
      remotePolicy: undefined,
      educationLevel: undefined,
      sector: undefined,
      salaryMin: 40000,
    });
  });

  it("ignore les types inattendus sans planter", () => {
    expect(parseSearchParams({ q: 42, contractType: "CDI" })).toEqual({
      q: undefined,
      city: undefined,
      contractType: undefined,
      remotePolicy: undefined,
      educationLevel: undefined,
      sector: undefined,
      salaryMin: undefined,
    });
    expect(parseSearchParams(null)).toEqual({});
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyJob, isInScope } from "./job-classifier";
import { isBaristaArea } from "@/lib/barista-area";
import { queryFamilies } from "@/lib/job-taxonomy";
import { makeStudentOffer } from "./scope";
import { baristaConnectors } from "./sources/barista";
import { PublicBoardConnector } from "./sources/public-boards";
import { sourceDefinitionSchema } from "./sources/catalog";
import { fetchJson } from "./http";
vi.mock("./http", async (original) => ({
  ...(await original<typeof import("./http")>()),
  fetchJson: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

describe("barista dans les zones suivies", () => {
  it.each(["Barista H/F", "Barista à temps partiel", "Coffee specialist", "Préparateur de café"])(
    "reconnaît %s avec tous les contrats",
    (title) => {
      const result = classifyJob(title);
      expect(result).toMatchObject({ universe: "HOSPITALITY", family: "BARISTA" });
      for (const contract of ["CDI", "CDD", "INTERIM", "STAGE", "ALTERNANCE", "PART_TIME"])
        expect(isInScope(result, contract, { city: "Toulouse" }).ok).toBe(true);
    },
  );
  it("classe les équipiers coffee shop uniquement avec des missions de café", () => {
    expect(
      classifyJob(
        "Employé polyvalent coffee shop",
        "Vos missions : préparer les cafés espresso et assurer le service au comptoir.",
      ).family,
    ).toBe("BARISTA");
    expect(
      classifyJob(
        "Employé polyvalent coffee shop",
        "Gestion administrative et suivi des commandes.",
      ).universe,
    ).toBe("OTHER");
    expect(classifyJob("Développeur logiciel Barista").universe).toBe("TECH");
    expect(classifyJob("Commercial machines à café").family).toBe("SALES");
    expect(classifyJob("Formateur barista").universe).toBe("OTHER");
  });
  it.each([
    "Toulouse",
    "Blagnac",
    "Colomiers",
    "Saint-Gaudens",
    "Bagnères-de-Luchon",
    "Agen",
    "Bordeaux",
    "Toulouse (31000)",
  ])("couvre %s", (city) => expect(isBaristaArea({ city })).toBe(true));
  it("accepte les environs d’Agen et Bordeaux sans étendre la collecte à toute la France", () => {
    expect(isBaristaArea({ city: "Le Passage", latitude: 44.2011, longitude: 0.6037 })).toBe(true);
    expect(isBaristaArea({ city: "Lormont", latitude: 44.876, longitude: -0.522 })).toBe(true);
    expect(isBaristaArea({ city: "Paris", latitude: 48.8566, longitude: 2.3522 })).toBe(false);
    expect(isBaristaArea({ city: "Lieu inconnu" })).toBe(false);
    expect(isInScope({ universe: "HOSPITALITY" }, "CDI", { city: "Paris" }).ok).toBe(false);
  });
  it("génère les requêtes des trois zones, avec des identifiants stables et sans clé", () => {
    const sources = baristaConnectors();
    expect(sources).toHaveLength(24);
    expect(new Set(sources.map((source) => source.id)).size).toBe(24);
    expect(sources.every(({ connector }) => connector.group === "HOSPITALITY")).toBe(true);
    expect(
      sources.find(({ id }) => id === "france-travail-barista-haute-garonne-barista")?.connector
        .definition.place,
    ).toBe("31D");
    expect(
      sources.find(({ id }) => id === "hellowork-barista-agen-barista")?.connector.definition
        .radiusKm,
    ).toBe(30);
    expect(queryFamilies("barista")).toEqual(["BARISTA"]);
  });
  it("conserve aussi les baristas CDI d'un flux employeur et écarte ceux de Paris", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      jobs: [
        {
          title: "Barista",
          employmentType: "FullTime",
          location: "Toulouse",
          address: { postalAddress: { addressCountry: "FR" } },
          descriptionPlain: "Préparation des cafés espresso et service au comptoir.",
          jobUrl: "https://jobs.ashbyhq.com/cafe/1",
        },
        {
          title: "Barista",
          employmentType: "FullTime",
          location: "Paris",
          address: { postalAddress: { addressCountry: "FR" } },
          descriptionPlain: "Préparation des cafés espresso et service au comptoir.",
          jobUrl: "https://jobs.ashbyhq.com/cafe/2",
        },
      ],
    });
    const connector = new PublicBoardConnector(
      sourceDefinitionSchema.parse({
        id: "coffee",
        label: "Coffee",
        kind: "ashby",
        url: "https://jobs.ashbyhq.com/cafe",
      }),
    );
    const offers = await connector.fetchOffers();
    expect(offers).toHaveLength(1);
    expect(offers[0].city).toBe("Toulouse");
    expect(
      makeStudentOffer(
        {
          title: "CDI développeur",
          city: "Toulouse",
          country: "FR",
          company: "Test",
          description: "Développement logiciel et automatisation des services.",
          url: "https://example.com/job",
        },
        { baristaContracts: true },
      ),
    ).toBeNull();
  });
});

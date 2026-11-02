import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseOfferSearchParams } from "@/lib/search-params";

const mocks = vi.hoisted(() => ({ search: vi.fn(), findMany: vi.fn(), origins: vi.fn() }));
vi.mock("@/lib/meilisearch", () => ({
  OFFERS_INDEX: "job_offers",
  getMeili: () => ({ index: () => ({ search: mocks.search }) }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: { findMany: mocks.findMany, findFirst: async () => null },
    hiddenOffer: { findMany: async () => [] },
    savedOffer: { findMany: async () => [] },
    offerOrigin: { findMany: mocks.origins },
  },
}));
vi.mock("@/server/personal/profile", () => ({ getPersonalProfile: async () => ({ id: "local" }) }));
vi.mock("@/server/search/sync", () => ({ offerToDocument: (offer: unknown) => offer }));
vi.mock("@/server/ingest/sources/geocode", () => ({
  geocodeCityFull: async () => ({ lat: 43.6045, lng: 1.444 }),
}));
vi.mock("@/server/companies/collections", () => ({ companySlugsForCollection: vi.fn() }));
import { searchOffers } from "./query";

const now = Date.now();
const offer = {
  id: "one",
  title: "Vendeur",
  universe: "COMMERCE",
  jobFamily: "RETAIL",
  specialty: "AUTRE",
  city: "Toulouse",
  status: "ACTIVE",
  contractType: "CDI",
  salaryMin: null,
  salaryMax: null,
  salaryPeriod: "UNKNOWN",
  publicationKnown: true,
  publishedAtTs: now,
  firstSeenAtTs: now,
  verifiedAtTs: now,
  tags: [],
  _geo: { lat: 43.6045, lng: 1.444 },
};
const meiliFilter = (call = 0) => mocks.search.mock.calls[call][1].filter as string;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue({
    hits: [offer],
    estimatedTotalHits: 1,
    totalHits: 1,
    page: 1,
    totalPages: 1,
  });
  mocks.findMany.mockResolvedValue([offer]);
  mocks.origins.mockResolvedValue([]);
});

describe("Recherche unifiée", () => {
  it("mélange tous les domaines par défaut, en France et sur les offres actives", async () => {
    await searchOffers(parseOfferSearchParams({}));
    const filter = meiliFilter();
    expect(filter).toContain('status IN ["ACTIVE"]');
    expect(filter).toContain('countryCode IN ["FR"]');
    expect(filter).not.toContain("universe");
  });

  it("filtre plusieurs domaines et additionne métier et spécialité tech (OU)", async () => {
    await searchOffers(
      parseOfferSearchParams({ univers: "TECH,ASV", metier: "ASV", specialite: "WEB" }),
    );
    expect(meiliFilter()).toContain('universe IN ["TECH", "ASV"]');
    expect(meiliFilter()).toContain('(jobFamily IN ["ASV"] OR specialty IN ["WEB"])');
  });

  it("accepte tous les contrats pour le commerce, l'ASV et la tech", async () => {
    const input = parseOfferSearchParams({ contrat: "CDI,STAGE,ALTERNANCE" });
    expect(input.contrat).toEqual(["CDI", "STAGE", "ALTERNANCE"]);
    await searchOffers(input);
    expect(meiliFilter()).toContain('contractType IN ["CDI", "STAGE", "ALTERNANCE"]');
  });

  it("limite à un rayon exact autour d'une ville, et sans ville reste national", async () => {
    await searchOffers(parseOfferSearchParams({ ville: "Toulouse", rayon: "30" }));
    expect(meiliFilter()).toContain("_geoRadius(43.6045, 1.444, 30000)");
    await searchOffers(parseOfferSearchParams({ univers: "ASV" }));
    expect(meiliFilter(1)).not.toContain("_geoRadius");
  });

  it("rapproche un intitulé connu par la classification et explique le classement", async () => {
    const result = await searchOffers(
      parseOfferSearchParams({ q: "commercial", tri: "pertinence" }),
    );
    expect(mocks.search.mock.calls[0][0]).toBe("");
    expect(meiliFilter()).toContain('"RETAIL"');
    expect(result.hits[0].reasons?.length).toBeGreaterThan(0);
  });

  it("garde la pagination native de l'index pour « Récentes »", async () => {
    await searchOffers(parseOfferSearchParams({}));
    expect(mocks.search.mock.calls[0][1]).toMatchObject({
      hitsPerPage: 12,
      sort: ["publishedAtTs:desc"],
    });
  });

  it("classe en mémoire pour la pertinence, avec la pertinence textuelle de l'index", async () => {
    await searchOffers(parseOfferSearchParams({ q: "chargé de clientèle", tri: "pertinence" }));
    expect(mocks.search.mock.calls[0][1]).toMatchObject({ showRankingScore: true, limit: 5000 });
  });

  it("préserve les salaires inconnus et écarte seulement une incompatibilité annuelle connue", async () => {
    mocks.search.mockResolvedValue({
      hits: [offer, { ...offer, id: "two", salaryPeriod: "YEAR", salaryMax: 20000 }],
      estimatedTotalHits: 2,
    });
    const result = await searchOffers(parseOfferSearchParams({ salaire: "30000" }));
    expect(result.hits.map((row) => row.id)).toEqual(["one"]);
  });

  it("sert les données PostgreSQL si le moteur tombe, avec la distance exacte", async () => {
    mocks.search.mockRejectedValue(new Error("Meili indisponible"));
    mocks.findMany.mockResolvedValue([
      offer,
      { ...offer, id: "far", _geo: { lat: 44, lng: 1.44 } },
    ]);
    const result = await searchOffers(
      parseOfferSearchParams({ ville: "Toulouse", rayon: "30", univers: "COMMERCE" }),
    );
    expect(result.engine).toBe("postgres");
    expect(result.hits.map((row) => row.id)).toEqual(["one"]);
    expect(mocks.findMany.mock.calls[0][0].where.universe).toEqual({ in: ["COMMERCE"] });
  });

  it("date une publication inconnue par sa première détection plutôt que de l'écarter", async () => {
    await searchOffers(parseOfferSearchParams({ datePub: "7j" }));
    expect(meiliFilter()).toContain("publicationKnown = true AND publishedAtTs >=");
    expect(meiliFilter()).toContain("publicationKnown = false AND firstSeenAtTs >=");
  });

  it("filtre par tag et par expérience", async () => {
    await searchOffers(parseOfferSearchParams({ tag: "DEBUTANT_ACCEPTE", experience: "JUNIOR" }));
    expect(meiliFilter()).toContain('tags IN ["DEBUTANT_ACCEPTE"]');
    expect(meiliFilter()).toContain('experienceLevel IN ["JUNIOR"]');
  });
});

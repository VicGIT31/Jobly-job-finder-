import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseOfferSearchParams } from "@/lib/search-params";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
}));
vi.mock("@/lib/meilisearch", () => ({
  OFFERS_INDEX: "job_offers",
  getMeili: () => ({ index: () => ({ search: mocks.search }) }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { jobOffer: { findMany: mocks.findMany, count: mocks.count, groupBy: mocks.groupBy } },
}));
vi.mock("@/server/search/sync", () => ({ offerToDocument: (offer: unknown) => offer }));
vi.mock("@/server/ingest/sources/geocode", () => ({ geocodeCityFull: vi.fn() }));
vi.mock("@/server/companies/collections", () => ({ companySlugsForCollection: vi.fn() }));
import { searchOffers } from "./query";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue({ hits: [], totalHits: 0 });
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
  mocks.groupBy.mockResolvedValue([]);
});

describe("recherche limitée aux stages et alternances", () => {
  it("ignore les anciens filtres CDI et temps plein, et impose le périmètre Meilisearch", async () => {
    const input = parseOfferSearchParams({ contrat: "CDI,FULL_TIME,STAGE" });
    expect(input.contrat).toEqual(["STAGE"]);
    await searchOffers(input);
    const filter = mocks.search.mock.calls[0][1].filter;
    expect(filter).toContain('contractType IN ["STAGE", "ALTERNANCE"]');
    expect(filter).toContain('contractType IN ["STAGE"]');
    expect(filter).not.toContain("FULL_TIME");
  });
  it("conserve le périmètre dans les résultats et facettes PostgreSQL en cas de panne", async () => {
    mocks.search.mockRejectedValue(new Error("Meili indisponible"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await searchOffers(parseOfferSearchParams({ contrat: "CDI,FULL_TIME" }));
      expect(result.engine).toBe("postgres");
      for (const fn of [mocks.findMany, mocks.count, mocks.groupBy]) {
        for (const [args] of fn.mock.calls) {
          expect(args.where.contractType.in).toEqual(["STAGE", "ALTERNANCE"]);
          expect(args.where.status).toBe("ACTIVE");
        }
      }
    } finally {
      error.mockRestore();
    }
  });
});

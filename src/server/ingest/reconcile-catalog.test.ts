import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ count: vi.fn(), find: vi.fn(), update: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { jobOffer: { count: mocks.count, findMany: mocks.find, updateMany: mocks.update } },
}));
vi.mock("@/server/search/sync", () => ({ syncOffersToSearch: mocks.sync }));
import { reconcileCatalog } from "./reconcile-catalog";
import type { SourceConnector } from "./sources/types";
const connector: SourceConnector = {
  sourceSite: "jobs.example",
  label: "Example",
  isEnabled: () => true,
  fetchOffers: async () => [],
  snapshotUrlPrefixes: ["https://jobs.example/company-a/"],
  coverage: {
    mode: "complete",
    complete: true,
    catalogTotal: 50,
    listingsSeen: 50,
    detailsRead: 50,
    accepted: 50,
  },
};
beforeEach(() => vi.resetAllMocks());
describe("rapprochement d'un catalogue employeur", () => {
  it.each([
    { ...connector, coverage: { ...connector.coverage!, complete: false } },
    { ...connector, snapshotUrlPrefixes: [] },
  ])(
    "ne retire aucune annonce à partir d'une collecte partielle ou sans périmètre fiable",
    async (source) => {
      expect(await reconcileCatalog(source, new Date(), [])).toBe(0);
      expect(mocks.find).not.toHaveBeenCalled();
    },
  );
  it("ne confond pas catalogue en panne et fermeture de toutes les annonces", async () => {
    mocks.count.mockResolvedValue(30);
    mocks.find.mockResolvedValue(Array.from({ length: 29 }, (_, i) => ({ id: String(i) })));
    const warnings: string[] = [];
    expect(await reconcileCatalog(connector, new Date(), warnings)).toBe(0);
    expect(warnings[0]).toContain("forte baisse");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("expire seulement les annonces absentes de ce board et non revues pendant le cycle", async () => {
    mocks.count.mockResolvedValue(50);
    mocks.find
      .mockResolvedValueOnce([{ id: "old" }])
      .mockResolvedValueOnce([{ id: "old", status: "EXPIRED" }]);
    mocks.update.mockResolvedValue({ count: 1 });
    const start = new Date();
    expect(await reconcileCatalog(connector, start, [])).toBe(1);
    expect(mocks.find.mock.calls[0][0].where).toMatchObject({
      OR: [{ sourceUrl: { startsWith: "https://jobs.example/company-a/" } }],
      lastSeenAt: { lt: start },
    });
    expect(mocks.update.mock.calls[0][0].where.lastSeenAt).toEqual({ lt: start });
  });
});

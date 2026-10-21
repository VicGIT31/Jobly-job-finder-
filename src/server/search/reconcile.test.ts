import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  documents: vi.fn(),
  sync: vi.fn(),
  remove: vi.fn(),
  configure: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { jobOffer: { findMany: mocks.find } } }));
vi.mock("@/lib/meilisearch", () => ({
  configureOffersIndex: mocks.configure,
  OFFERS_INDEX: "job_offers",
  getMeili: () => ({ index: () => ({ getDocuments: mocks.documents }) }),
}));
vi.mock("./sync", () => ({ syncOffersToSearch: mocks.sync, removeOffersFromSearch: mocks.remove }));
import { reconcileSearchIndex } from "./reconcile";
beforeEach(() => vi.resetAllMocks());
describe("réparation périodique de l'index", () => {
  it("réindexe par curseur et ne supprime que les documents absents de la base", async () => {
    mocks.find
      .mockResolvedValueOnce([{ id: "a" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "a" }, { id: "new-during-sync" }]);
    mocks.documents
      .mockResolvedValueOnce({
        results: [{ id: "a" }, { id: "orphan" }, { id: "new-during-sync" }],
      })
      .mockResolvedValueOnce({ results: [] });
    expect(await reconcileSearchIndex()).toEqual({ indexed: 1, removed: 1 });
    expect(mocks.find.mock.calls[1][0]).toMatchObject({ cursor: { id: "a" }, skip: 1 });
    expect(mocks.remove).toHaveBeenCalledWith(["orphan"]);
    expect(mocks.sync).toHaveBeenCalledWith([{ id: "a" }]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { jobOffer: { findMany: mocks.find, updateMany: mocks.update } },
}));
vi.mock("@/lib/settings", () => ({
  getSettings: async () => ({ freshnessDays: 7, maxAgeDays: 60 }),
}));
vi.mock("@/server/search/sync", () => ({
  syncOffersToSearch: mocks.sync,
  removeOffersFromSearch: vi.fn(),
}));
import { expireStaleOffers } from "./freshness";
beforeEach(() => vi.resetAllMocks());
describe("expiration automatique", () => {
  it("recontrôle la fraîcheur à l'écriture pour préserver une annonce revue en parallèle", async () => {
    const now = new Date("2026-10-21T12:00:00Z");
    mocks.find
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    mocks.update.mockResolvedValue({ count: 1 });
    expect(await expireStaleOffers(now)).toBe(1);
    expect(mocks.update.mock.calls[0][0].where).toMatchObject({
      status: "ACTIVE",
      OR: [
        { lastSeenAt: { lt: new Date("2026-10-14T12:00:00Z") } },
        { validThrough: { lte: now } },
      ],
    });
    expect(mocks.sync).toHaveBeenCalledOnce();
  });
  it("n'écrit rien lorsque toutes les annonces sont fraîches", async () => {
    mocks.find.mockResolvedValue([]);
    expect(await expireStaleOffers()).toBe(0);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../http", async (original) => ({
  ...(await original<typeof import("../http")>()),
  fetchJson: vi.fn(),
}));
import { fetchJson } from "../http";
import { FreeWorkConnector } from "./free-work";
afterEach(() => vi.resetAllMocks());
describe("contrats et doublons Free-Work", () => {
  it("ne transforme pas un stage en alternance quand il apparaît dans les deux filtres", async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      {
        title: "Stage de fin d'études - Ingénieur Data",
        slug: "stage-data",
        company: { name: "Test" },
        location: { shortLabel: "Paris", countryCode: "FR" },
        description: "Développement de pipelines de données en Python et SQL.",
      },
    ]);
    const offers = await new FreeWorkConnector().fetchOffers();
    expect(offers).toHaveLength(1);
    expect(offers[0].contractType).toBe("stage");
  });
  it("signale une réponse illisible au lieu d'une collecte vide réussie", async () => {
    vi.mocked(fetchJson).mockResolvedValue(null);
    const source = new FreeWorkConnector();
    expect(await source.fetchOffers()).toEqual([]);
    expect(source.warnings.length).toBeGreaterThan(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { assertPublicTarget } from "./public-network";
import { fetchText, fetchWithRetry, resetHttpState } from "./http";
vi.mock("./public-network", () => ({
  assertPublicTarget: vi.fn(async (url: URL) => {
    if (url.hostname === "127.0.0.1") throw new Error("Adresse locale refusée");
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  resetHttpState();
});
describe("transport des URLs découvertes", () => {
  it("revalide chaque redirection avant de demander sa destination", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      fetchWithRetry("https://company.fr/", { publicOnly: true, minIntervalMs: 0 }),
    ).rejects.toThrow("locale");
    expect(fetch).toHaveBeenCalledOnce();
    expect(assertPublicTarget).toHaveBeenCalledTimes(2);
  });
  it("arrête une boucle de redirections", async () => {
    const fetch = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "/redirect" } }),
    );
    vi.stubGlobal("fetch", fetch);
    expect(
      await fetchWithRetry("https://company.fr/", { publicOnly: true, minIntervalMs: 0 }),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(6);
  });
  it("borne la lecture du corps HTTP avant son traitement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("x".repeat(100))),
    );
    expect(
      await fetchText("https://company.fr/", { maxBodyBytes: 20, minIntervalMs: 0 }),
    ).toBeNull();
  });
});

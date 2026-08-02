import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RateLimitedError,
  fetchWithRetry,
  isHostCircuitOpen,
  mapPool,
  resetHttpState,
} from "./http";

const FAST = { minIntervalMs: 0, backoffMs: 1 };

function response(status: number, body = ""): Response {
  return new Response(body, { status });
}

describe("fetchWithRetry", () => {
  beforeEach(() => {
    resetHttpState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie la réponse dès le premier essai réussi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, "ok"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://exemple.test/a", FAST);

    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejoue après une erreur serveur puis réussit", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200, "ok"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://exemple.test/b", FAST);

    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejoue après une panne réseau", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(response(200, "ok"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://exemple.test/c", FAST);

    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("abandonne sans rejouer sur un 404 (définitif)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(404));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://exemple.test/d", FAST);

    expect(res).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("réinitialise le compteur de rate-limit après une réponse réussie", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200, "ok"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithRetry("https://reprise.test/a", FAST);
    expect(isHostCircuitOpen("reprise.test")).toBe(false);
  });

  it("ouvre le disjoncteur de l'hôte après des rate-limits répétés", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(429));
    vi.stubGlobal("fetch", fetchMock);

    // Un seul appel (3 tentatives) ne suffit pas à couper l'hôte : il rend null.
    await expect(fetchWithRetry("https://limite.test/d", FAST)).resolves.toBeNull();
    expect(isHostCircuitOpen("limite.test")).toBe(false);

    // Le second appel épuise le quota d'échecs et coupe l'hôte.
    await expect(fetchWithRetry("https://limite.test/e", FAST)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    expect(isHostCircuitOpen("limite.test")).toBe(true);

    // Hôte coupé : plus aucun appel réseau tant que le cycle n'est pas réinitialisé.
    const before = fetchMock.mock.calls.length;
    await expect(fetchWithRetry("https://limite.test/f", FAST)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(before);

    resetHttpState();
    expect(isHostCircuitOpen("limite.test")).toBe(false);
  });
});

describe("mapPool", () => {
  it("préserve l'ordre et filtre les résultats nuls", async () => {
    const out = await mapPool([1, 2, 3, 4], 2, async (n) => (n % 2 === 0 ? n * 10 : null));
    expect(out).toEqual([20, 40]);
  });

  it("ne dépasse jamais la concurrence demandée", async () => {
    let running = 0;
    let peak = 0;

    await mapPool(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async (n) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 2));
        running--;
        return n;
      },
    );

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("ignore les erreurs ponctuelles d'un élément", async () => {
    const out = await mapPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });
    expect(out).toEqual([1, 3]);
  });

  it("interrompt le pool quand un hôte est coupé", async () => {
    let handled = 0;
    const out = await mapPool(
      Array.from({ length: 20 }, (_, i) => i),
      2,
      async (n) => {
        handled++;
        if (n === 1) throw new RateLimitedError("limite.test");
        return n;
      },
    );

    expect(handled).toBeLessThan(20);
    expect(out).not.toContain(1);
  });
});

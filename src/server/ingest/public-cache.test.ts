import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readCachedBody, writeCachedBody } from "./public-cache";
import { fetchText, resetHttpState } from "./http";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "jobly-cache-test-"));
  vi.stubEnv("INGEST_CACHE_DIR", directory);
  resetHttpState();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await rm(directory, { recursive: true, force: true });
});
describe("cache public persistant", () => {
  it("réutilise une description récente et rappelle la source après expiration", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async () => new Response("offre publique"));
    vi.stubGlobal("fetch", fetchMock);
    const options = { cacheTtlMs: 1000, minIntervalMs: 0 };
    expect(await fetchText("https://example.com/job/1", options)).toBe("offre publique");
    expect(await fetchText("https://example.com/job/1", options)).toBe("offre publique");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 1001);
    await fetchText("https://example.com/job/1", options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("ne réutilise jamais une réponse périmée", async () => {
    await writeCachedBody("public", "description");
    expect(await readCachedBody("public", 0)).toBeNull();
    expect(await readCachedBody("missing", 1000)).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("../http", () => ({ fetchJson: vi.fn() }));
import { fetchJson } from "../http";
import { searchDiscoverySeeds } from "./search-discovery";
let directory: string;
beforeEach(async () => { vi.clearAllMocks(); directory = await mkdtemp(join(tmpdir(), "jobly-api-")); vi.stubEnv("INGEST_CACHE_DIR", directory); vi.stubEnv("JOBLY_DISCOVERY_CONFIG", join(directory, "key.json")); vi.stubEnv("TAVILY_API_KEY", ""); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
const key = async (dailyLimit = 20) => writeFile(join(directory, "key.json"), JSON.stringify({ provider: "tavily", apiKey: "example-test-key-only", dailyLimit, monthlyLimit: 600 }));
describe("découverte C facultative à quota plafonné", () => {
  it("utilise le mode sans clé officiellement prévu et garde une désactivation explicite", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ results: [] });
    await searchDiscoverySeeds(); expect(vi.mocked(fetchJson).mock.calls[0][1]?.headers).toMatchObject({ "X-Tavily-Access-Mode": "keyless" });
    expect(vi.mocked(fetchJson).mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
    vi.clearAllMocks(); vi.stubEnv("JOBLY_SEARCH_DISCOVERY", "0");
    expect((await searchDiscoverySeeds()).seeds).toEqual([]); expect(fetchJson).not.toHaveBeenCalled();
  });
  it("plafonne durablement les tentatives, ne transforme pas les extraits en offres", async () => {
    await key(2); vi.mocked(fetchJson).mockResolvedValue({ results: [{ url: "https://entreprise.fr/careers" }, { url: "http://127.0.0.1/jobs" }] });
    const result = await searchDiscoverySeeds();
    expect(result.seeds).toEqual([{ url: "https://entreprise.fr/careers", label: "entreprise.fr" }, { url: "https://entreprise.fr/careers", label: "entreprise.fr" }]);
    await searchDiscoverySeeds(); expect(fetchJson).toHaveBeenCalledTimes(2);
    const usage = JSON.parse(await readFile(join(directory, "search-discovery", "usage.json"), "utf8")); expect(usage.daily).toBe(2);
    const options = vi.mocked(fetchJson).mock.calls[0][1]!; expect(options.retries).toBe(0); expect(JSON.parse(options.body!).search_depth).toBe("basic");
  });
  it("met en pause après un refus sans exposer la clé ni bloquer la collecte autonome", async () => {
    await key(); vi.mocked(fetchJson).mockResolvedValue(null);
    const first = await searchDiscoverySeeds(); await searchDiscoverySeeds();
    expect(fetchJson).toHaveBeenCalledTimes(1); expect(first.warnings.join()).not.toContain("example-test-key-only"); expect(first.warnings.join()).toContain("24 h");
  });
  it("suspend les appels si le compteur est corrompu", async () => {
    await key(); await mkdir(join(directory, "search-discovery")); await writeFile(join(directory, "search-discovery", "usage.json"), "invalid");
    expect((await searchDiscoverySeeds()).warnings.join()).toContain("Compteur"); expect(fetchJson).not.toHaveBeenCalled();
  });
});

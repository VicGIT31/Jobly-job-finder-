import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverSources, detectBoard, discoveryLinks } from "./discovery";
import {
  emptyDiscoveryState,
  enqueueDiscovery,
  readDiscoveryState,
  saveDiscoveryState,
} from "./discovery-store";
import { fetchJson, fetchText, fetchWithRetry } from "../http";

vi.mock("../http", async (original) => ({
  ...(await original<typeof import("../http")>()),
  fetchJson: vi.fn(),
  fetchText: vi.fn(),
  fetchWithRetry: vi.fn(),
}));
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "jobly-discovery-"));
  vi.stubEnv("JOB_DISCOVERY_FILE", join(directory, "state.json"));
  vi.mocked(fetchWithRetry).mockImplementation(async () => new Response("User-agent: *\nAllow: /"));
});
afterEach(async () => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe("découverte autonome persistante", () => {
  it("découvre Workable et Inria sans deviner de slugs et refuse le lien Workable générique", () => {
    expect(detectBoard("https://apply.workable.com/huggingface/")?.kind).toBe("workable");
    expect(detectBoard("https://apply.workable.com/j/ABC")).toBeNull();
    expect(detectBoard("https://jobs.inria.fr/public/classic/fr/offres/2026-10662")?.url).toContain("filtre=stage-recherche");
    expect(discoveryLinks('<a href="https://jobs.ashbyhq.com/mistral.ai">Apply now</a>', "https://mistral.ai/careers/")).toContain("https://jobs.ashbyhq.com/mistral.ai");
  });
  it("normalise un lien d'annonce ATS, y compris Workday sans locale", () => {
    expect(detectBoard("https://jobs.lever.co/acme/123?source=site")?.url).toBe(
      "https://jobs.lever.co/acme",
    );
    expect(detectBoard("https://acme.wd3.myworkdayjobs.com/External/job/Paris/123")?.url).toBe(
      "https://acme.wd3.myworkdayjobs.com/External",
    );
    expect(
      detectBoard("https://acme.wd3.myworkdayjobs.com/fr-FR/External/job/Paris/123")?.url,
    ).toBe("https://acme.wd3.myworkdayjobs.com/fr-FR/External");
    expect(detectBoard("https://jobs.smartrecruiters.com/Acme/123")?.url).toBe(
      "https://careers.smartrecruiters.com/Acme",
    );
    expect(detectBoard("https://jobs.lever.co.evil.test/acme")).toBeNull();
    expect(detectBoard("https://127.0.0.1/jobs")).toBeNull();
    expect(detectBoard("https://acme.recruitee.com/o/stage")?.kind).toBe("recruitee");
    expect(detectBoard("https://acme.teamtailor.com/jobs/123")?.url).toBe(
      "https://acme.teamtailor.com/",
    );
  });
  it("suit les liens carrière, les iframes et les URLs ATS dans une configuration embarquée", () => {
    const links = discoveryLinks(
      '<a href="/carrieres">Rejoignez-nous</a><a href="/boutique">Acheter</a><iframe src="https://jobs.ashbyhq.com/Acme"></iframe><script>{"ats":"https:\\/\\/jobs.lever.co\\/acme"}</script>',
      "https://entreprise.fr",
    );
    expect(links).toContain("https://entreprise.fr/carrieres");
    expect(links).toContain("https://jobs.ashbyhq.com/Acme");
    expect(links).toContain("https://jobs.lever.co/acme");
    expect(links).not.toContain("https://entreprise.fr/boutique");
  });
  it("découvre un board depuis un annuaire puis un site entreprise et l'active seulement après vérification", async () => {
    vi.mocked(fetchJson).mockImplementation(async (url) =>
      String(url).startsWith("https://query.wikidata.org/")
        ? {
            results: {
              bindings: [
                { website: { value: "https://entreprise.fr" }, name: { value: "Entreprise" } },
              ],
            },
          }
        : { jobs: [{ title: "Stage assurance" }] },
    );
    vi.mocked(fetchText).mockResolvedValue('<a href="https://jobs.ashbyhq.com/Acme">Carrières</a>');
    // Les amorces embarquées sont reportées pour isoler le parcours de l'annuaire.
    const seed = emptyDiscoveryState();
    const bundled = (await import("../../../../config/job-sources.json")).default;
    const candidates = (await import("../../../../config/france-career-candidates.json")).default;
    for (const source of [...bundled, ...candidates])
      enqueueDiscovery(seed, source.url, source.label);
    for (const entry of seed.frontier) entry.nextAt = Date.now() + 86400000;
    await saveDiscoveryState(seed);
    const result = await discoverSources({ maxPages: 3 });
    expect(result.added).toBe(1);
    expect(result.directoryEmployers).toBe(1);
    const saved = await readDiscoveryState();
    expect(saved.sources[0].definition).toMatchObject({
      kind: "ashby",
      url: "https://jobs.ashbyhq.com/Acme",
      enabled: true,
    });
    const catalog = await (await import("./catalog")).loadSourceCatalog();
    expect(catalog.some((source) => source.url === "https://jobs.ashbyhq.com/Acme")).toBe(true);
    const again = await discoverSources({ maxPages: 3 });
    expect(again.added).toBe(0);
    expect(again.pages).toBe(0);
    expect(JSON.parse(await readFile(join(directory, "state.json"), "utf8")).version).toBe(1);
  });
  it("n'active jamais un endpoint absent et conserve un délai de reprise", async () => {
    const state = emptyDiscoveryState();
    enqueueDiscovery(state, "https://jobs.ashbyhq.com/Nothing", "Nothing", 3);
    await saveDiscoveryState(state);
    vi.mocked(fetchJson).mockResolvedValue({ jobs: [] });
    const result = await discoverSources({ directory: false, maxPages: 1 });
    expect(result.added).toBe(0);
    const saved = await readDiscoveryState();
    expect(saved.frontier[0].failures).toBe(1);
    expect(saved.frontier[0].nextAt).toBeGreaterThan(Date.now());
  });
  it("respecte robots.txt avant de demander une page carrière", async () => {
    const state = emptyDiscoveryState();
    enqueueDiscovery(state, "https://entreprise.fr/carrieres", "Entreprise", 3);
    await saveDiscoveryState(state);
    vi.mocked(fetchWithRetry).mockResolvedValue(new Response("User-agent: *\nDisallow: /"));
    const result = await discoverSources({ directory: false, maxPages: 1 });
    expect(fetchText).not.toHaveBeenCalled();
    expect(result.warnings[0]).toContain("robots");
  });
});

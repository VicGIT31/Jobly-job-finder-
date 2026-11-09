import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  eval: vi.fn(),
  sources: vi.fn(),
  process: vi.fn(),
  record: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { ingestRun: { create: mocks.record } } }));
vi.mock("@/lib/redis", () => ({ getRedis: () => ({ set: mocks.set, eval: mocks.eval }) }));
vi.mock("./sources", () => ({ getSourceConnectors: mocks.sources }));
vi.mock("./ingest", () => ({ processIngest: mocks.process }));
vi.mock("./verify-links", () => ({ verifyKnownOfferLinks: async () => ({ checked: 0 }) }));
import { IngestionAlreadyRunningError, runIngestion } from "./run-ingestion";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.set.mockResolvedValue("OK");
  mocks.eval.mockResolvedValue(1);
  mocks.record.mockResolvedValue({});
  mocks.process.mockResolvedValue({ created: 0, updated: 0, duplicates: 0, rejected: 0 });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("coordination des collectes automatiques", () => {
  it("indexe un lot avant la fin de la source et ne le traite pas deux fois", async () => {
    const offer = { title: "Stage IA", description: "Entraîner des modèles de machine learning.", sourceUrl: "https://employer.fr/jobs/one", city: "Paris", companyName: "Employeur", contractType: "stage", sector: "Tech" };
    mocks.process.mockResolvedValue({ received: 1, created: 1, updated: 0, duplicates: 0, rejected: 0, errors: [], indexingErrors: 0 });
    mocks.sources.mockResolvedValue([{ label: "Employeur", sourceSite: "employer.fr", isEnabled: () => true, fetchOffers: async (options: import("./sources/types").CollectionOptions) => { await options.onBatch!([offer]); expect(mocks.process).toHaveBeenCalledOnce(); return [offer]; } }]);
    const [run] = await runIngestion(); expect(mocks.process).toHaveBeenCalledOnce(); expect(run.summary?.created).toBe(1);
    const recorded = mocks.record.mock.calls[0][0].data; expect(recorded.startedAt.getTime()).toBeLessThanOrEqual(recorded.completedAt.getTime()); expect(recorded.cycleId).toBeTruthy();
  });
  it("signale un budget dépassé même si un ancien connecteur rend ses résultats partiels", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(AbortSignal.abort());
    mocks.sources.mockResolvedValue([
      {
        sourceSite: "test.example",
        label: "Test",
        isEnabled: () => true,
        fetchOffers: async () => [],
      },
    ]);
    const results = await runIngestion();
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain("Budget de temps");
  });
  it("avance sur les autres sources malgré une source lente, avec au plus quatre collectes", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    let active = 0;
    let peak = 0;
    let fifthStarted = false;
    mocks.sources.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        label: `Source ${index}`,
        sourceSite: `source${index}.example`,
        isEnabled: () => true,
        fetchOffers: async () => {
          active++;
          peak = Math.max(peak, active);
          if (index === 4) fifthStarted = true;
          if (index === 0) await slow;
          else await Promise.resolve();
          active--;
          return [];
        },
      })),
    );
    const running = runIngestion();
    await vi.waitFor(() => expect(fifthStarted).toBe(true));
    release();
    const results = await running;
    expect(peak).toBe(4);
    expect(results.map((result) => result.label)).toEqual(
      Array.from({ length: 5 }, (_, index) => `Source ${index}`),
    );
    expect(mocks.record).toHaveBeenCalledTimes(5);
    expect(mocks.eval).toHaveBeenCalledTimes(1);
  });

  it("ne lance rien et ne libère pas le verrou d'un autre processus", async () => {
    mocks.set.mockResolvedValue(null);
    await expect(runIngestion()).rejects.toBeInstanceOf(IngestionAlreadyRunningError);
    expect(mocks.sources).not.toHaveBeenCalled();
    expect(mocks.eval).not.toHaveBeenCalled();
  });

  it("libère son propre verrou lorsque le catalogue est invalide", async () => {
    mocks.sources.mockRejectedValue(new Error("Catalogue invalide"));
    await expect(runIngestion()).rejects.toThrow("Catalogue invalide");
    const token = mocks.set.mock.calls[0][1];
    expect(mocks.eval.mock.calls[0]).toEqual([
      expect.stringContaining("ARGV[1]"),
      1,
      "jobly:ingestion:lock",
      token,
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  companyUpdate: vi.fn(),
  log: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, update: mocks.update },
    company: { update: mocks.companyUpdate },
    ingestLog: { create: mocks.log },
  },
}));
vi.mock("@/server/search/sync", () => ({ syncOffersToSearch: mocks.sync }));
import { processIngest } from "./ingest";

beforeEach(() => vi.clearAllMocks());
describe("rafraîchissement et indexation par lots", () => {
  it("rejette aussi les imports internes non tech ou hors France avant écriture", async () => {
    const offer = {
      title: "Stage développeur",
      companyName: "Test",
      city: "Paris",
      description: "Développement de logiciels TypeScript",
      contractType: "stage",
      sector: "Tech",
      sourceUrl: "https://example.com/job/1",
    };
    const result = await processIngest("internal", [
      { ...offer, title: "Stage vendeur" },
      { ...offer, countryCode: "GB", city: "London" },
    ]);
    expect(result.rejected).toBe(2);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("rafraîchit les descriptions sans débloquer la modération, et n'indexe qu'un lot", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "existing",
      companyId: "company",
      blockedAt: new Date(),
    });
    mocks.update.mockImplementation(async (input) => ({
      ...input.data,
      id: "existing",
      company: {},
    }));
    const raw = {
      title: "Stage développeur",
      companyName: "Test",
      city: "Paris",
      description: "Description réelle fraîche de développement logiciel",
      contractType: "stage",
      sector: "Tech",
      sourceUrl: "https://example.com/job/1",
    };
    const result = await processIngest("example.com", [raw, { ...raw, title: "Stage data" }]);
    expect(result.duplicates).toBe(2);
    expect(mocks.update.mock.calls[0][0].data.description).toBe(raw.description);
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.sync.mock.calls[0][0]).toHaveLength(2);
  });
  it("indexe les offres déjà écrites même si l'écriture suivante échoue", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing", companyId: "company", blockedAt: null });
    mocks.update
      .mockResolvedValueOnce({ id: "existing", company: {} })
      .mockRejectedValueOnce(new Error("DB write failed"));
    const raw = {
      title: "Stage développeur",
      companyName: "Test",
      city: "Paris",
      description: "Description de développement logiciel",
      contractType: "stage",
      sector: "Tech",
      sourceUrl: "https://example.com/job/1",
    };
    await expect(processIngest("example.com", [raw, raw])).rejects.toThrow("DB write failed");
    expect(mocks.sync.mock.calls[0][0]).toHaveLength(1);
  });
  it("ne remplace pas une annonce complète par un extrait d'alerte email", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing", companyId: "company", blockedAt: null });
    mocks.update.mockImplementation(async (input) => ({
      ...input.data,
      id: "existing",
      company: {},
    }));
    await processIngest("local-job-alerts", [
      {
        title: "Stage développeur",
        companyName: "Test",
        city: "Paris",
        description: "Extrait d'une alerte email concernant le développement logiciel",
        descriptionIsExcerpt: true,
        contractType: "stage",
        sector: "Tech",
        sourceUrl: "https://fr.indeed.com/viewjob?jk=abcdef1234567890",
      },
    ]);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("sourceUrl");
    expect(data).not.toHaveProperty("educationLevel");
  });
});

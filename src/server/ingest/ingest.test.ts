import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn().mockResolvedValue([]),
  update: vi.fn(),
  originFind: vi.fn().mockResolvedValue(null),
  originUpsert: vi.fn(),
  companyUpdate: vi.fn(),
  log: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobOffer: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      update: mocks.update,
    },
    offerOrigin: { findUnique: mocks.originFind, upsert: mocks.originUpsert },
    company: { update: mocks.companyUpdate },
    ingestLog: { create: mocks.log },
  },
}));
vi.mock("@/server/search/sync", () => ({ syncOffersToSearch: mocks.sync }));
import { processIngest } from "./ingest";

beforeEach(() => vi.clearAllMocks());
describe("rafraîchissement et indexation par lots", () => {
  const studentOffer = {
    title: "Stage développeur",
    companyName: "Test",
    city: "Paris",
    description: "Développement de logiciels TypeScript",
    contractType: "stage",
    sector: "Tech",
    sourceUrl: "https://example.com/job/1",
  };
  it("rejette une annonce expirée, trop ancienne, observée trop tôt ou datée dans le futur", async () => {
    const now = Date.now();
    const result = await processIngest("example.com", [
      { ...studentOffer, validThrough: new Date(now - 1000) },
      { ...studentOffer, publishedAt: new Date(now - 61 * 86_400_000) },
      { ...studentOffer, publishedAt: new Date(now + 3 * 86_400_000) },
      { ...studentOffer, scrapedAt: new Date(now - 8 * 86_400_000) },
    ]);
    expect(result.rejected).toBe(4);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("conserve l'observation et la date limite réelles lors d'une mise à jour", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing", companyId: "company", blockedAt: null });
    mocks.update.mockImplementation(async ({ data }) => ({ ...data, id: "existing", company: {} }));
    const scrapedAt = new Date(Date.now() - 3600_000);
    const validThrough = new Date(Date.now() + 2 * 86_400_000);
    await processIngest("example.com", [
      { ...studentOffer, scrapedAt, validThrough, salaryMin: 1000, salaryMax: 1500 },
    ]);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({
      scrapedAt,
      lastSeenAt: scrapedAt,
      validThrough,
      salaryMin: 1000,
      salaryMax: 1500,
    });
  });
  it("distingue une annonce inchangée d'une vraie mise à jour", async () => {
    const existing = {
      ...studentOffer,
      specialty: "AUTRE",
      contractType: "STAGE",
      status: "ACTIVE",
      id: "existing",
      companyId: "company",
      blockedAt: null,
    };
    mocks.findUnique.mockResolvedValue(existing);
    mocks.update.mockResolvedValue({ ...existing, company: {} });
    const result = await processIngest("example.com", [studentOffer]);
    expect(result.duplicates).toBe(1);
    expect(result.updated).toBe(0);
  });
  it("signale une indexation en échec sans perdre l'écriture en base", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing", companyId: "company", blockedAt: null });
    mocks.update.mockResolvedValue({ id: "existing", company: {} });
    mocks.sync.mockRejectedValueOnce(new Error("index indisponible"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const result = await processIngest("example.com", [studentOffer]);
      expect(result.indexingErrors).toBe(1);
      expect(mocks.update).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });
  it("rejette les imports internes dont le métier n'est pas suivi ou hors France avant écriture", async () => {
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
      { ...offer, title: "Stage comptable", description: "Tenue de la comptabilité fournisseurs et clôtures mensuelles" },
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
    expect(result.updated).toBe(2);
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
    expect(data).not.toHaveProperty("lastSeenAt");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("contractType");
    expect(data).not.toHaveProperty("publishedAt");
    expect(data).not.toHaveProperty("scrapedAt");
  });
});

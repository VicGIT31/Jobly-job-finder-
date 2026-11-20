import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { enrichNationalBatch } from "./national-ai";
import type { RawOffer } from "./normalize";

const mocks = vi.hoisted(() => ({ config: vi.fn(), reserve: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock("./assistant-config", () => ({ readAssistantConfig: mocks.config, reserveAssistantCall: mocks.reserve }));
vi.mock("./public-cache", () => ({ readCachedBody: mocks.read, writeCachedBody: mocks.write }));

const ambiguous: RawOffer = { title: "Adjoint polyvalent", description: "Organiser la permanence avec l’équipe. Contact : contact@example.com", companyName: "Test", city: "Lyon", contractType: "cdi", sector: "Non renseigné", sourceUrl: "https://example.com" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue(null);
  vi.stubEnv("JOBLY_SUBSCRIPTION_URL", "http://127.0.0.1:4000/classify");
  vi.stubEnv("JOBLY_SUBSCRIPTION_TOKEN", "test-token");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("n’appelle aucun fournisseur en mode local", async () => {
  mocks.config.mockResolvedValue({ provider: "local", dailyCalls: 6 });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect((await enrichNationalBatch([ambiguous])).size).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("envoie une demande bornée au service local d’abonnement et mémorise la catégorie", async () => {
  const response = { text: '{"items":[{"i":0,"domain":"SERVICES"}]}' };
  mocks.config.mockResolvedValue({ provider: "chatgpt", model: "gpt-test", dailyCalls: 3 });
  mocks.reserve.mockResolvedValue(true);
  const fetch = vi.fn().mockResolvedValue(Response.json(response));
  vi.stubGlobal("fetch", fetch);
  const result = await enrichNationalBatch([{ ...ambiguous, title: "Plombier" }, ambiguous]);
  expect([...result]).toEqual([[1, "SERVICES"]]);
  expect(mocks.reserve).toHaveBeenCalledWith(3);
  expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:4000/classify");
  expect(fetch.mock.calls[0][1].body).not.toContain("contact@example.com");
  expect(mocks.write).toHaveBeenCalledWith(expect.stringMatching(/^ai-national-v1:/), "SERVICES");
});

it("utilise les réponses en cache et respecte le plafond persistant", async () => {
  mocks.config.mockResolvedValue({ provider: "chatgpt", model: "gpt-test", dailyCalls: 2 });
  mocks.read.mockResolvedValueOnce("HEALTH");
  mocks.reserve.mockResolvedValue(false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const result = await enrichNationalBatch([ambiguous, { ...ambiguous, title: "Renfort polyvalent" }]);
  expect([...result]).toEqual([[0, "HEALTH"]]);
  expect(fetch).not.toHaveBeenCalled();
});

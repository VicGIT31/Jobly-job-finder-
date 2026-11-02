import { afterEach, describe, expect, it, vi } from "vitest";
import { getSourceConnectors } from "./index";
afterEach(() => vi.unstubAllEnvs());
describe("sélection des sources gratuites", () => {
  it("n'active aucun fournisseur payant même si d'anciennes clés subsistent", async () => {
    vi.stubEnv("JSEARCH_API_KEY", "unused-old-key");
    vi.stubEnv("FRANCE_TRAVAIL_CLIENT_ID", "unused-client");
    vi.stubEnv("INGEST_SOURCES", "");
    const connectors = await getSourceConnectors();
    expect(connectors.some((connector) => /JSearch|OAuth/.test(connector.label))).toBe(false);
    expect(connectors.some((connector) => connector.label === "AniCura France")).toBe(true);
    expect(connectors.every((connector) => connector.personal)).toBe(true);
  });
  it("limite réellement les cycles aux entreprises sélectionnées", async () => {
    vi.stubEnv("INGEST_SOURCES", "airbus,thales");
    expect((await getSourceConnectors()).map((connector) => connector.label)).toEqual([
      "Airbus",
      "Thales",
    ]);
  });
  it("signale une sélection inconnue", async () => {
    vi.stubEnv("INGEST_SOURCES", "typo-company");
    await expect(getSourceConnectors()).rejects.toThrow("Sources inconnues");
  });
});

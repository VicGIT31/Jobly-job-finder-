import { describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { assertPublicTarget, isPublicAddress, publicHttpUrl } from "./public-network";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
describe("réseau de découverte", () => {
  it.each([
    "https://localhost/a",
    "http://127.0.0.1",
    "https://[::1]",
    "https://169.254.169.254",
    "https://user:pass@site.fr",
    "https://site.internal",
    "https://site.fr:444",
    "file:///etc/passwd",
  ])("refuse %s", (url) => expect(publicHttpUrl(url)).toBeNull());
  it.each([
    "10.2.1.1",
    "127.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])("refuse l'adresse résolue %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
  it("refuse un nom public qui résout sur le réseau local", async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: "10.0.0.1", family: 4 }] as never);
    await expect(assertPublicTarget(new URL("https://company.fr"))).rejects.toThrow("non publique");
  });
});

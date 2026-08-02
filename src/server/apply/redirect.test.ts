import { describe, expect, it, vi } from "vitest";
import { resolveApply, type ApplyDeps, type ApplyOffer } from "./redirect";

function makeDeps(offer: ApplyOffer | null): ApplyDeps & { recordClick: ReturnType<typeof vi.fn> } {
  return {
    findOffer: vi.fn(async () => offer),
    recordClick: vi.fn(async () => undefined),
  };
}

const activeOffer: ApplyOffer = {
  id: "offer-1",
  slug: "stage-dev-fullstack-alan-paris",
  status: "ACTIVE",
  sourceUrl: "https://www.welcometothejungle.com/jobs/alan-stage-1000",
};

describe("resolveApply — /go/:offerId", () => {
  it("redirige vers la source et enregistre le clic (user connecté)", async () => {
    const deps = makeDeps(activeOffer);
    const result = await resolveApply(deps, "offer-1", "user-42", "https://jobly.test/offres/x");

    expect(result).toEqual({ kind: "redirect", url: activeOffer.sourceUrl });
    expect(deps.recordClick).toHaveBeenCalledExactlyOnceWith({
      offerId: "offer-1",
      userId: "user-42",
      referer: "https://jobly.test/offres/x",
    });
  });

  it("enregistre le clic anonyme (user_id null)", async () => {
    const deps = makeDeps(activeOffer);
    const result = await resolveApply(deps, "offer-1", null, null);

    expect(result.kind).toBe("redirect");
    expect(deps.recordClick).toHaveBeenCalledExactlyOnceWith({
      offerId: "offer-1",
      userId: null,
      referer: null,
    });
  });

  it("offre expirée → page dédiée, aucun clic compté", async () => {
    const deps = makeDeps({ ...activeOffer, status: "EXPIRED" });
    const result = await resolveApply(deps, "offer-1", "user-42", null);

    expect(result).toEqual({ kind: "expired", slug: activeOffer.slug });
    expect(deps.recordClick).not.toHaveBeenCalled();
  });

  it("offre inconnue → not_found, aucun clic compté", async () => {
    const deps = makeDeps(null);
    const result = await resolveApply(deps, "nope", null, null);

    expect(result).toEqual({ kind: "not_found" });
    expect(deps.recordClick).not.toHaveBeenCalled();
  });
});

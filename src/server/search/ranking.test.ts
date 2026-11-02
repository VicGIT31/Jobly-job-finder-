import { describe, expect, it } from "vitest";
import { rankOffer } from "./ranking";
import type { OfferDocument } from "./sync";

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 2, 12);
const base = {
  id: "a",
  title: "Auxiliaire vétérinaire",
  universe: "ASV",
  jobFamily: "ASV",
  specialty: "AUTRE",
  status: "ACTIVE",
  jobConfidence: 1,
  jobEvidence: ["Intitulé d’ASV / AVQ"],
  publicationKnown: true,
  publishedAtTs: now - 2 * DAY,
  firstSeenAtTs: now - 2 * DAY,
  verifiedAtTs: now,
} as unknown as OfferDocument;
const context = {
  center: null,
  query: "",
  families: [] as string[],
  specialties: [] as string[],
  now,
};

describe("Classement explicable", () => {
  it("favorise une annonce publiée récemment, même si une plus ancienne vient d'être revue", () => {
    const fresh = rankOffer(base, context);
    const old = rankOffer({ ...base, publishedAtTs: now - 40 * DAY, verifiedAtTs: now }, context);
    expect(fresh.score).toBeGreaterThan(old.score);
  });

  it("ne confond pas une première détection récente avec une publication connue", () => {
    const known = rankOffer(base, context);
    const unknown = rankOffer(
      { ...base, publicationKnown: false, firstSeenAtTs: now - 2 * DAY },
      context,
    );
    expect(known.score).toBeGreaterThan(unknown.score);
  });

  it("pénalise une annonce qu'on ne revoit plus et une disponibilité à confirmer", () => {
    const stale = rankOffer({ ...base, verifiedAtTs: now - 10 * DAY }, context);
    const uncertain = rankOffer({ ...base, status: "UNCERTAIN" }, context);
    const normal = rankOffer(base, context);
    expect(stale.score).toBeLessThan(normal.score);
    expect(uncertain.score).toBeLessThan(normal.score);
    expect(stale.reasons.join(" ")).toContain("Plus revue");
  });

  it("récompense le métier demandé, la proximité exacte et la pertinence textuelle", () => {
    const near = { lat: 43.6, lng: 1.44 };
    const withJob = rankOffer(base, { ...context, families: ["ASV"] });
    expect(withJob.score).toBeGreaterThan(rankOffer(base, context).score);
    const close = rankOffer({ ...base, _geo: near }, { ...context, center: near, radius: 30 });
    const far = rankOffer(
      { ...base, _geo: { lat: 44.2, lng: 1.4 } },
      { ...context, center: near, radius: 100 },
    );
    expect(close.score).toBeGreaterThan(far.score);
    expect(close.distanceKm).toBeLessThan(1);
    const relevant = rankOffer({ ...base, _rankingScore: 1 }, { ...context, query: "auxiliaire" });
    expect(relevant.score).toBeGreaterThan(
      rankOffer({ ...base, _rankingScore: 0 }, { ...context, query: "auxiliaire" }).score,
    );
  });

  it("explique ses raisons avec les indices du classement", () => {
    expect(rankOffer(base, context).reasons).toContain("Intitulé d’ASV / AVQ");
  });
});

import { describe, expect, it } from "vitest";
import { excludeHiddenOffers } from "./hidden-filter";

describe("excludeHiddenOffers", () => {
  it("retourne les hits inchangés si rien n'est masqué", () => {
    const hits = [{ id: "a" }, { id: "b" }];
    expect(excludeHiddenOffers(hits, new Set())).toEqual(hits);
  });

  it("retire les offres masquées", () => {
    const hits = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(excludeHiddenOffers(hits, new Set(["b"]))).toEqual([{ id: "a" }, { id: "c" }]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const hits = [{ id: "a" }, { id: "b" }];
    excludeHiddenOffers(hits, new Set(["a"]));
    expect(hits).toHaveLength(2);
  });
});

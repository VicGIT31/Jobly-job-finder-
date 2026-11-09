import { describe, expect, it } from "vitest";
import { scheduleSources } from "./schedule";
import type { SourceConnector } from "./sources/types";
const source = (label: string, personal = false, priority: "AI" | "DEFAULT" = "DEFAULT"): SourceConnector => ({ label, sourceSite: label, personal, priority, isEnabled: () => true, fetchOffers: async () => [] });
describe("ordonnancement équitable", () => {
  it("sert IA, métiers existants, découverte et employeurs dès les quatre premiers créneaux", () => {
    const ai = source("Thales", false, "AI"), old = source("Finance", true), board = source("Capgemini"), discovery = source("discovery.jobly", true);
    const list = [old, ...Array.from({ length: 76 }, (_, i) => source(`local-${i}`, true)), board, discovery, ai];
    const ordered = scheduleSources(list);
    expect(ordered.slice(0, 4)).toEqual([ai, old, discovery, board]);
    expect(new Set(ordered).size).toBe(list.length);
  });
  it("préserve les sources et leur ordre relatif quand une seule catégorie est sélectionnée", () => {
    const selected = [source("Airbus", false, "AI"), source("Thales", false, "AI")];
    expect(scheduleSources(selected)).toEqual(selected);
  });
});

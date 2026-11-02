import { describe, expect, it } from "vitest";
import { formatDateFr, formatSalary, timeAgo } from "./format";

describe("format d'offre", () => {
  it("formate une date à l'identique sous Node et Chromium, indépendamment du fuseau", () => {
    expect(formatDateFr(Date.parse("2026-07-17T23:45:00.000Z"))).toBe("17 juil. 2026");
  });

  it("conserve les formats de salaire et de fraîcheur existants", () => {
    expect(formatSalary(30_000, 35_000, "YEAR")).toBe("30 k€–35 k€ /an");
    expect(timeAgo(Date.now())).toBe("aujourd'hui");
  });
});

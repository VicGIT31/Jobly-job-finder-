import { describe, expect, it } from "vitest";
import { followUpFlag } from "./follow-up";

const NOW = new Date("2026-08-14T12:00:00Z");
function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

describe("followUpFlag", () => {
  it("ne signale rien avant le seuil (APPLIED = 7 jours)", () => {
    expect(followUpFlag("APPLIED", daysAgo(6), NOW)).toBeNull();
  });

  it("signale au seuil et au-delà (APPLIED = 7 jours)", () => {
    expect(followUpFlag("APPLIED", daysAgo(7), NOW)).toEqual({
      days: 7,
      message: "Postulé il y a 7 jours — envisagez une relance",
    });
    expect(followUpFlag("APPLIED", daysAgo(10), NOW)?.days).toBe(10);
  });

  it("ASSESSMENT — seuil à 5 jours, message dédié", () => {
    expect(followUpFlag("ASSESSMENT", daysAgo(4), NOW)).toBeNull();
    expect(followUpFlag("ASSESSMENT", daysAgo(5), NOW)?.message).toMatch(/Test envoyé/);
  });

  it("INTERVIEW — seuil à 3 jours, message dédié", () => {
    expect(followUpFlag("INTERVIEW", daysAgo(2), NOW)).toBeNull();
    expect(followUpFlag("INTERVIEW", daysAgo(3), NOW)?.message).toMatch(/Entretien passé/);
  });

  it("jamais de rappel pour SAVED, OFFER, REJECTED, WITHDRAWN", () => {
    expect(followUpFlag("SAVED", daysAgo(999), NOW)).toBeNull();
    expect(followUpFlag("OFFER", daysAgo(999), NOW)).toBeNull();
    expect(followUpFlag("REJECTED", daysAgo(999), NOW)).toBeNull();
    expect(followUpFlag("WITHDRAWN", daysAgo(999), NOW)).toBeNull();
  });
});

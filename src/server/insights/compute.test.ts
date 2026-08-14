import { describe, expect, it } from "vitest";
import { computeInsights, type ApplicationForInsights } from "./compute";

const NOW = new Date("2026-08-14T12:00:00Z");
function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

function app(
  historyStatuses: {
    status: ApplicationForInsights["history"][number]["status"];
    daysAgo: number;
  }[],
  createdDaysAgo = 30,
): ApplicationForInsights {
  return {
    createdAt: daysAgo(createdDaysAgo),
    history: historyStatuses.map((h) => ({ status: h.status, changedAt: daysAgo(h.daysAgo) })),
  };
}

describe("computeInsights", () => {
  it("pas assez de données sous le seuil minimum", () => {
    const result = computeInsights([app([{ status: "APPLIED", daysAgo: 1 }])]);
    expect(result.hasEnoughData).toBe(false);
    // Calculable même sous le seuil (l'appelant doit vérifier hasEnoughData
    // avant d'afficher) : ici aucun retour reçu, donc 0.
    expect(result.responseRate).toBe(0);
  });

  it("funnel : compte chaque étape atteinte au moins une fois, indépendamment du statut final", () => {
    const applications = [
      app([{ status: "APPLIED", daysAgo: 20 }]),
      app([
        { status: "APPLIED", daysAgo: 20 },
        { status: "INTERVIEW", daysAgo: 10 },
        { status: "REJECTED", daysAgo: 5 },
      ]),
      app([
        { status: "APPLIED", daysAgo: 20 },
        { status: "INTERVIEW", daysAgo: 10 },
        { status: "OFFER", daysAgo: 3 },
      ]),
    ];
    const result = computeInsights(applications, NOW);
    expect(result.funnel).toEqual([
      { key: "APPLIED", label: "Postulé", count: 3 },
      { key: "RESPONSE", label: "Réponse obtenue", count: 2 }, // REJECTED + OFFER comptent comme réponse
      { key: "INTERVIEW", label: "Entretien", count: 2 },
      { key: "OFFER", label: "Offre", count: 1 },
    ]);
    expect(result.hasEnoughData).toBe(true);
    expect(result.responseRate).toBeCloseTo(2 / 3);
    expect(result.interviewRate).toBeCloseTo(2 / 3);
  });

  it("une candidature encore SAVED (jamais postulée) ne compte pas dans le funnel", () => {
    const applications = [
      app([{ status: "SAVED", daysAgo: 2 }]),
      app([{ status: "APPLIED", daysAgo: 1 }]),
      app([{ status: "APPLIED", daysAgo: 1 }]),
      app([{ status: "APPLIED", daysAgo: 1 }]),
    ];
    const result = computeInsights(applications, NOW);
    expect(result.funnel[0].count).toBe(3);
  });

  it("taux null si aucune candidature postulée (division par zéro évitée)", () => {
    const result = computeInsights([app([{ status: "SAVED", daysAgo: 1 }])], NOW);
    expect(result.responseRate).toBeNull();
    expect(result.interviewRate).toBeNull();
  });

  it("« cette semaine » ne compte que les 7 derniers jours", () => {
    const applications = [
      app([{ status: "APPLIED", daysAgo: 1 }], 1),
      app([{ status: "APPLIED", daysAgo: 10 }], 10),
      app([
        { status: "APPLIED", daysAgo: 20 },
        { status: "INTERVIEW", daysAgo: 2 },
      ]),
      app([
        { status: "APPLIED", daysAgo: 20 },
        { status: "OFFER", daysAgo: 9 },
      ]),
    ];
    const result = computeInsights(applications, NOW);
    expect(result.thisWeek.applications).toBe(1);
    expect(result.thisWeek.interviews).toBe(1);
    expect(result.thisWeek.offers).toBe(0);
  });
});

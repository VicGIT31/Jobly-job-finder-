/**
 * Analytics du suivi de candidature (`/mon-espace/insights`, spec §29).
 * Fonction pure : prend des candidatures + leur historique de statut déjà
 * chargés, ne touche jamais la base — testable sans dépendance.
 *
 * « Only display conclusions when there is enough data » (spec §29) :
 * `hasEnoughData` doit être vérifié par l'appelant avant d'afficher les taux.
 */
import type { ApplicationStatus } from "@prisma/client";

const MIN_SAMPLE = 3;
const WEEK_MS = 7 * 86_400_000;

export type HistoryEntry = { status: ApplicationStatus; changedAt: Date };

export type ApplicationForInsights = {
  createdAt: Date;
  history: HistoryEntry[];
};

export type FunnelStep = {
  key: "APPLIED" | "RESPONSE" | "INTERVIEW" | "OFFER";
  label: string;
  count: number;
};

export type InsightsResult = {
  total: number;
  hasEnoughData: boolean;
  thisWeek: { applications: number; interviews: number; offers: number };
  funnel: FunnelStep[];
  responseRate: number | null;
  interviewRate: number | null;
};

const RESPONSE_STATUSES: ApplicationStatus[] = ["ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"];

function reached(app: ApplicationForInsights, statuses: ApplicationStatus[]): boolean {
  return app.history.some((h) => statuses.includes(h.status));
}

export function computeInsights(
  applications: ApplicationForInsights[],
  now: Date = new Date(),
): InsightsResult {
  const weekStart = now.getTime() - WEEK_MS;

  const appliedCount = applications.filter((a) => reached(a, ["APPLIED"])).length;
  const responseCount = applications.filter((a) => reached(a, RESPONSE_STATUSES)).length;
  const interviewCount = applications.filter((a) => reached(a, ["INTERVIEW"])).length;
  const offerCount = applications.filter((a) => reached(a, ["OFFER"])).length;

  const thisWeekApplications = applications.filter(
    (a) => a.createdAt.getTime() >= weekStart,
  ).length;
  const thisWeekInterviews = applications.filter((a) =>
    a.history.some((h) => h.status === "INTERVIEW" && h.changedAt.getTime() >= weekStart),
  ).length;
  const thisWeekOffers = applications.filter((a) =>
    a.history.some((h) => h.status === "OFFER" && h.changedAt.getTime() >= weekStart),
  ).length;

  return {
    total: applications.length,
    hasEnoughData: appliedCount >= MIN_SAMPLE,
    thisWeek: {
      applications: thisWeekApplications,
      interviews: thisWeekInterviews,
      offers: thisWeekOffers,
    },
    funnel: [
      { key: "APPLIED", label: "Postulé", count: appliedCount },
      { key: "RESPONSE", label: "Réponse obtenue", count: responseCount },
      { key: "INTERVIEW", label: "Entretien", count: interviewCount },
      { key: "OFFER", label: "Offre", count: offerCount },
    ],
    responseRate: appliedCount > 0 ? responseCount / appliedCount : null,
    interviewRate: appliedCount > 0 ? interviewCount / appliedCount : null,
  };
}

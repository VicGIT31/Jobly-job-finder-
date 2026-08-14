import type { ApplicationStatus } from "@prisma/client";

/**
 * Délai (en jours) sans changement de statut au-delà duquel une candidature
 * est signalée « à relancer » sur le tableau (`/mon-espace/candidatures`).
 * SAVED (pas encore postulé), OFFER (l'utilisateur sait déjà que c'est urgent)
 * et les statuts archivés (REJECTED/WITHDRAWN) n'ont pas de rappel : ce ne
 * sont pas des candidatures « en attente ».
 */
const THRESHOLD_DAYS: Partial<Record<ApplicationStatus, number>> = {
  APPLIED: 7,
  ASSESSMENT: 5,
  INTERVIEW: 3,
};

export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export type FollowUpFlag = { days: number; message: string };

/**
 * `statusChangedAt` doit venir du dernier `ApplicationStatusHistory`, pas de
 * `Application.updatedAt` (qui bouge aussi quand on édite juste une note).
 */
export function followUpFlag(
  status: ApplicationStatus,
  statusChangedAt: Date,
  now: Date = new Date(),
): FollowUpFlag | null {
  const threshold = THRESHOLD_DAYS[status];
  if (threshold == null) return null;

  const days = daysSince(statusChangedAt, now);
  if (days < threshold) return null;

  const message =
    status === "APPLIED"
      ? `Postulé il y a ${days} jours — envisagez une relance`
      : status === "ASSESSMENT"
        ? `Test envoyé il y a ${days} jours sans nouvelle — relancez le recruteur`
        : `Entretien passé il y a ${days} jours sans retour — un mot de remerciement ou une relance peut aider`;

  return { days, message };
}

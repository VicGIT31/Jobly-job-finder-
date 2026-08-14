import type { ApplicationStatus } from "@prisma/client";

/** Libellés FR des statuts du suivi de candidature (`/mon-espace/candidatures`). */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Sauvegardée",
  APPLIED: "Postulé",
  ASSESSMENT: "Test / évaluation",
  INTERVIEW: "Entretien",
  OFFER: "Offre reçue",
  REJECTED: "Refusée",
  WITHDRAWN: "Retirée",
};

/** Colonnes actives du tableau Kanban, dans l'ordre d'affichage. */
export const BOARD_COLUMNS: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
];

/** Statuts archivés : accessibles mais hors du tableau principal (§23 du cahier des charges). */
export const ARCHIVED_STATUSES: ApplicationStatus[] = ["REJECTED", "WITHDRAWN"];

export const ALL_STATUSES: ApplicationStatus[] = [...BOARD_COLUMNS, ...ARCHIVED_STATUSES];

/**
 * Suivi de candidature (`/mon-espace/candidatures`).
 * `nextStatusOnApply` est extrait en fonction pure pour être testable sans
 * base de données ; `syncApplicationOnApply` fait l'opération Prisma autour.
 */
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Le clic « Postuler » ne doit jamais faire régresser une candidature déjà
 * avancée (ex. déjà en entretien) : seul `null` (pas de suivi) ou `SAVED`
 * (offre juste sauvegardée) passe à `APPLIED`.
 */
export function nextStatusOnApply(current: ApplicationStatus | null): ApplicationStatus {
  if (current === null || current === "SAVED") return "APPLIED";
  return current;
}

export type ApplyOfferSnapshot = {
  id: string;
  title: string;
  sourceUrl: string;
  companyName: string;
  companyLogoUrl: string | null;
};

/**
 * Crée ou met à jour l'entrée de suivi au clic « Postuler » (ou bouton
 * « Déjà postulée »). Best-effort côté appelant : ne doit jamais bloquer la
 * redirection réelle vers la source.
 */
export async function syncApplicationOnApply(
  userId: string,
  offer: ApplyOfferSnapshot,
): Promise<void> {
  const existing = await prisma.application.findUnique({
    where: { userId_offerId: { userId, offerId: offer.id } },
  });

  const status = nextStatusOnApply(existing?.status ?? null);
  const statusChanged = !existing || existing.status !== status;
  const appliedAt = existing?.appliedAt ?? (status === "APPLIED" ? new Date() : null);

  const application = await prisma.application.upsert({
    where: { userId_offerId: { userId, offerId: offer.id } },
    create: {
      userId,
      offerId: offer.id,
      companyName: offer.companyName,
      jobTitle: offer.title,
      companyLogoUrl: offer.companyLogoUrl,
      sourceUrl: offer.sourceUrl,
      status,
      appliedAt,
    },
    update: { status, appliedAt },
  });

  if (statusChanged) {
    await prisma.applicationStatusHistory.create({
      data: { applicationId: application.id, status },
    });
  }
}

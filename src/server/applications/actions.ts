"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/server/auth/actions";
import { syncApplicationOnApply } from "./tracker";

const TRACKER_PATH = "/mon-espace/candidatures";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const manualSchema = z.object({
  companyName: z.string().trim().min(1, "Entreprise requise.").max(160),
  jobTitle: z.string().trim().min(1, "Intitulé requis.").max(200),
  sourceUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "L'URL doit commencer par http(s)://"),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.APPLIED),
});

/** Ajoute une candidature qui n'est pas passée par une offre Jobly (Postuler sur un site externe, etc.). */
export async function createManualApplication(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = manualSchema.safeParse({
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    sourceUrl: formData.get("sourceUrl") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const application = await prisma.application.create({
    data: {
      userId,
      companyName: parsed.data.companyName,
      jobTitle: parsed.data.jobTitle,
      sourceUrl: parsed.data.sourceUrl || null,
      status: parsed.data.status,
      appliedAt: parsed.data.status === "SAVED" ? null : new Date(),
    },
  });
  await prisma.applicationStatusHistory.create({
    data: { applicationId: application.id, status: parsed.data.status },
  });

  revalidatePath(TRACKER_PATH);
  return { ok: true, message: "Candidature ajoutée." };
}

/** Marque une offre comme « déjà postulée » sans passer par /go (candidature faite ailleurs). */
export async function markAlreadyApplied(offerId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      company: { select: { name: true, logoUrl: true } },
    },
  });
  if (!offer) return { ok: false, error: "Offre introuvable." };

  await syncApplicationOnApply(userId, {
    id: offer.id,
    title: offer.title,
    sourceUrl: offer.sourceUrl,
    companyName: offer.company.name,
    companyLogoUrl: offer.company.logoUrl,
  });

  revalidatePath(TRACKER_PATH);
  return { ok: true, message: "Candidature suivie." };
}

const statusSchema = z.nativeEnum(ApplicationStatus);

/** Change le statut d'une candidature (drag-and-drop ou sélecteur), avec historique. */
export async function updateApplicationStatus(
  applicationId: string,
  status: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Statut invalide." };

  const application = await prisma.application.findFirst({ where: { id: applicationId, userId } });
  if (!application) return { ok: false, error: "Candidature introuvable." };
  if (application.status === parsed.data) return { ok: true };

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: parsed.data,
      appliedAt: application.appliedAt ?? (parsed.data === "SAVED" ? null : new Date()),
    },
  });
  await prisma.applicationStatusHistory.create({
    data: { applicationId, status: parsed.data },
  });

  revalidatePath(TRACKER_PATH);
  return { ok: true };
}

/** Notes libres attachées à une candidature (entretiens, contacts, relances…). */
export async function updateApplicationNotes(
  applicationId: string,
  notes: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const trimmed = notes.slice(0, 5000);
  const { count } = await prisma.application.updateMany({
    where: { id: applicationId, userId },
    data: { notes: trimmed || null },
  });
  if (count === 0) return { ok: false, error: "Candidature introuvable." };

  revalidatePath(TRACKER_PATH);
  return { ok: true, message: "Note enregistrée." };
}

export async function deleteApplication(applicationId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.application.deleteMany({ where: { id: applicationId, userId } });
  revalidatePath(TRACKER_PATH);
}

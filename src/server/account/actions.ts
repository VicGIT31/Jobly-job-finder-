"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EducationLevel, TechSpecialty } from "@prisma/client";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { extractCvText } from "@/server/cv/extract-text";
import type { ActionResult } from "@/server/auth/actions";

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 Mo

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  headline: z.string().max(200).optional().or(z.literal("")),
  school: z.string().max(200).optional().or(z.literal("")),
  graduationYear: z.coerce.number().int().min(1990).max(2040).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  // Préférences du score de correspondance (`src/server/match/score.ts`) :
  // chaîne vide = non renseigné → null en base, jamais deviné.
  educationLevel: z.nativeEnum(EducationLevel).optional().or(z.literal("")),
  targetSpecialty: z.nativeEnum(TechSpecialty).optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    headline: formData.get("headline"),
    school: formData.get("school"),
    graduationYear: formData.get("graduationYear") || "",
    city: formData.get("city"),
    educationLevel: formData.get("educationLevel") || "",
    targetSpecialty: formData.get("targetSpecialty") || "",
  });
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs du formulaire." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      headline: parsed.data.headline || null,
      school: parsed.data.school || null,
      graduationYear:
        typeof parsed.data.graduationYear === "number" ? parsed.data.graduationYear : null,
      city: parsed.data.city || null,
      educationLevel: parsed.data.educationLevel || null,
      targetSpecialty: parsed.data.targetSpecialty || null,
    },
  });

  revalidatePath("/mon-espace");
  return { ok: true, message: "Profil mis à jour." };
}

/** Upload du CV : PDF uniquement, 5 Mo max, stocké sur S3/MinIO. */
export async function uploadCv(formData: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Sélectionnez un fichier PDF." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { ok: false, error: "Le CV dépasse 5 Mo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Vérification du magic number PDF (%PDF) — le type MIME ne suffit pas
  if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
    return { ok: false, error: "Le fichier doit être un PDF valide." };
  }

  const key = `cv/${userId}/${Date.now()}.pdf`;
  try {
    await getStorage().put(key, buffer, "application/pdf");
  } catch {
    return { ok: false, error: "Stockage indisponible, réessayez plus tard." };
  }

  // Extraction lexicale (pas d'IA) pour la comparaison CV/offre — voir
  // src/server/cv/analyze.ts. Un PDF illisible (scan sans texte) ne bloque
  // pas l'upload : cvText reste simplement null, la comparaison est masquée.
  const cvText = await extractCvText(buffer);

  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { cvKey: true } });
  await prisma.user.update({
    where: { id: userId },
    data: { cvKey: key, cvFilename: file.name, cvUploadedAt: new Date(), cvText },
  });
  if (previous?.cvKey) {
    await getStorage()
      .delete(previous.cvKey)
      .catch(() => undefined);
  }

  revalidatePath("/mon-espace");
  return { ok: true, message: "CV mis à jour." };
}

export async function deleteCv(): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Connexion requise." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cvKey: true } });
  if (user?.cvKey) {
    await getStorage()
      .delete(user.cvKey)
      .catch(() => undefined);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { cvKey: null, cvFilename: null, cvUploadedAt: null, cvText: null },
  });

  revalidatePath("/mon-espace");
  return { ok: true, message: "CV supprimé." };
}

export async function removeSavedOffer(offerId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.savedOffer.deleteMany({ where: { userId, offerId } });
  revalidatePath("/mon-espace/sauvegardees");
}

/** Réaffiche une offre masquée (retrait de `HiddenOffer`). */
export async function unhideOffer(offerId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.hiddenOffer.deleteMany({ where: { userId, offerId } });
  revalidatePath("/mon-espace/masquees");
}

const frequencySchema = z.enum(["DAILY", "WEEKLY", "NEVER"]);

export async function updateAlertFrequency(searchId: string, frequency: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  const parsed = frequencySchema.safeParse(frequency);
  if (!parsed.success) return;
  await prisma.savedSearch.updateMany({
    where: { id: searchId, userId },
    data: { frequency: parsed.data },
  });
  revalidatePath("/mon-espace/alertes");
}

export async function deleteAlert(searchId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.savedSearch.deleteMany({ where: { id: searchId, userId } });
  revalidatePath("/mon-espace/alertes");
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/**
 * « Supprimer mon compte et mes données » (spec §45, RGPD). Suppression
 * définitive et immédiate — pas de période de grâce, cohérent avec
 * l'absence de période de rétention configurée ailleurs dans le produit.
 * Le CV (S3/MinIO) n'est pas couvert par la cascade de la base : supprimé
 * explicitement avant la suppression du compte. Toutes les autres données
 * (candidatures, offres sauvegardées/masquées, recherches sauvegardées,
 * sessions) sont supprimées par les contraintes `onDelete: Cascade` du
 * schéma ; seuls les clics de candidature (`ApplyClick`) sont anonymisés
 * (`onDelete: SetNull`) plutôt que supprimés, pour ne pas fausser les
 * statistiques d'ingestion déjà agrégées.
 */
export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cvKey: true } });
  if (user?.cvKey) {
    await getStorage()
      .delete(user.cvKey)
      .catch(() => undefined);
  }

  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/" });
}

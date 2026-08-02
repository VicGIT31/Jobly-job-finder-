"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  generalSettingsSchema,
  ingestionSettingsSchema,
  saveSettings,
  seoSettingsSchema,
} from "@/lib/settings";
import { removeOffersFromSearch, syncOffersToSearch } from "@/server/search/sync";
import { runIngestion } from "@/server/ingest/run-ingestion";
import { recordAudit } from "./audit";
import { requireAdminAction } from "./guard";

/**
 * Server Actions du panneau d'administration.
 *
 * Règles communes à toutes :
 * 1. `requireAdminAction()` revalide le rôle **en base** (le JWT ne suffit pas) ;
 * 2. l'action est journalisée dans `audit_logs` ;
 * 3. les garde-fous anti-verrouillage empêchent un administrateur de se retirer
 *    lui-même les droits ou de supprimer le dernier compte admin du site.
 */

/** Une case à cocher absente du FormData vaut « décochée ». */
function checkbox(form: FormData, name: string): boolean {
  return form.get(name) === "on" || form.get(name) === "true";
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------- Offres

/** Modération : désactive (EXPIRED) ou réactive (ACTIVE) une offre + sync index. */
export async function toggleOfferStatus(offerId: string): Promise<void> {
  const admin = await requireAdminAction();

  const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
  if (!offer) return;

  // Désactiver pose aussi `blockedAt` : sans lui, l'ingestion suivante
  // retrouverait l'offre sur la source et annulerait la modération.
  const deactivating = offer.status === "ACTIVE";
  const updated = await prisma.jobOffer.update({
    where: { id: offerId },
    data: deactivating
      ? { status: "EXPIRED", blockedAt: new Date() }
      : { status: "ACTIVE", blockedAt: null, lastSeenAt: new Date() },
    include: { company: true },
  });

  try {
    await syncOffersToSearch([updated]);
  } catch (err) {
    console.error("[admin] Sync Meilisearch échouée :", err);
  }

  await recordAudit(
    admin,
    updated.status === "ACTIVE" ? "offer.reactivated" : "offer.deactivated",
    offerId,
    updated.title,
  );
  revalidatePath("/admin/offres");
}

/** Suppression définitive d'une offre (base + index). Clics et favoris suivent en cascade. */
export async function deleteOffer(offerId: string): Promise<void> {
  const admin = await requireAdminAction();

  const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
  if (!offer) return;

  await prisma.jobOffer.delete({ where: { id: offerId } });
  try {
    await removeOffersFromSearch([offerId]);
  } catch (err) {
    console.error("[admin] Retrait Meilisearch échoué :", err);
  }

  await recordAudit(admin, "offer.deleted", offerId, offer.title);
  revalidatePath("/admin/offres");
}

// ----------------------------------------------------------- Entreprises

/** Met une entreprise en avant sur la page d'accueil (ou l'en retire). */
export async function toggleCompanyFeatured(companyId: string): Promise<void> {
  const admin = await requireAdminAction();

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return;

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { featured: !company.featured },
  });

  await recordAudit(
    admin,
    updated.featured ? "company.featured" : "company.unfeatured",
    companyId,
    company.name,
  );
  revalidatePath("/admin/entreprises");
  revalidatePath("/");
}

/** Supprime une entreprise **et toutes ses offres** (cascade), index compris. */
export async function deleteCompany(companyId: string): Promise<void> {
  const admin = await requireAdminAction();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { offers: { select: { id: true } } },
  });
  if (!company) return;

  const offerIds = company.offers.map((o) => o.id);
  await prisma.company.delete({ where: { id: companyId } });
  if (offerIds.length > 0) {
    try {
      await removeOffersFromSearch(offerIds);
    } catch (err) {
      console.error("[admin] Retrait Meilisearch échoué :", err);
    }
  }

  await recordAudit(
    admin,
    "company.deleted",
    companyId,
    `${company.name} (${offerIds.length} offre(s) supprimée(s))`,
  );
  revalidatePath("/admin/entreprises");
}

// --------------------------------------------------------- Utilisateurs

/** Nombre d'administrateurs actifs — sert de garde-fou anti-verrouillage. */
async function activeAdminCount(): Promise<number> {
  return prisma.user.count({ where: { role: Role.ADMIN, suspendedAt: null } });
}

/** Promeut un compte administrateur ou le rétrograde en utilisateur. */
export async function toggleUserRole(userId: string): Promise<void> {
  const admin = await requireAdminAction();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  // On ne se retire pas soi-même les droits : il faut passer par un autre admin.
  if (user.id === admin.id) return;
  if (user.role === Role.ADMIN && (await activeAdminCount()) <= 1) return;

  const nextRole = user.role === Role.ADMIN ? Role.USER : Role.ADMIN;
  await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });

  await recordAudit(admin, "user.role.changed", userId, `${user.email} → ${nextRole}`);
  revalidatePath("/admin/utilisateurs");
}

/** Suspend un compte (connexion refusée) ou le réactive. Données conservées. */
export async function toggleUserSuspension(userId: string): Promise<void> {
  const admin = await requireAdminAction();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.id === admin.id) return;
  if (!user.suspendedAt && user.role === Role.ADMIN && (await activeAdminCount()) <= 1) return;

  const suspendedAt = user.suspendedAt ? null : new Date();
  await prisma.user.update({ where: { id: userId }, data: { suspendedAt } });

  await recordAudit(admin, suspendedAt ? "user.suspended" : "user.reinstated", userId, user.email);
  revalidatePath("/admin/utilisateurs");
}

/** Valide manuellement l'adresse email d'un compte. */
export async function verifyUserEmail(userId: string): Promise<void> {
  const admin = await requireAdminAction();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return;

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await recordAudit(admin, "user.email.verified", userId, user.email);
  revalidatePath("/admin/utilisateurs");
}

/**
 * Définit un nouveau mot de passe pour un compte. Le mot de passe transite par
 * le FormData, n'est jamais journalisé et n'est stocké que haché (bcrypt).
 */
export async function setUserPassword(userId: string, form: FormData): Promise<void> {
  const admin = await requireAdminAction();

  const password = text(form, "password");
  if (password.length < 8) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  await recordAudit(admin, "user.password.reset", userId, user.email);
  revalidatePath("/admin/utilisateurs");
}

/** Supprime définitivement un compte et ses données liées (cascade). */
export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdminAction();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.id === admin.id) return;
  if (user.role === Role.ADMIN && (await activeAdminCount()) <= 1) return;

  await prisma.user.delete({ where: { id: userId } });
  await recordAudit(admin, "user.deleted", userId, user.email);
  revalidatePath("/admin/utilisateurs");
}

// -------------------------------------------------------------- Réglages

/** Enregistre les réglages SEO (titres, description, indexation, robots.txt). */
export async function saveSeoSettings(form: FormData): Promise<void> {
  const admin = await requireAdminAction();

  const parsed = seoSettingsSchema.safeParse({
    siteName: text(form, "siteName"),
    defaultTitle: text(form, "defaultTitle"),
    titleTemplate: text(form, "titleTemplate"),
    description: text(form, "description"),
    keywords: text(form, "keywords"),
    canonicalUrl: text(form, "canonicalUrl"),
    indexable: checkbox(form, "indexable"),
    googleSiteVerification: text(form, "googleSiteVerification"),
    bingSiteVerification: text(form, "bingSiteVerification"),
    twitterHandle: text(form, "twitterHandle"),
    robotsDisallow: text(form, "robotsDisallow"),
  });
  if (!parsed.success) return;

  await saveSettings("seo", parsed.data, admin.email);
  await recordAudit(admin, "settings.seo.updated", null);
  revalidatePath("/", "layout");
}

/** Enregistre les réglages généraux (maintenance, inscriptions, contact). */
export async function saveGeneralSettings(form: FormData): Promise<void> {
  const admin = await requireAdminAction();

  const parsed = generalSettingsSchema.safeParse({
    tagline: text(form, "tagline"),
    contactEmail: text(form, "contactEmail"),
    maintenanceMode: checkbox(form, "maintenanceMode"),
    maintenanceMessage: text(form, "maintenanceMessage"),
    registrationOpen: checkbox(form, "registrationOpen"),
  });
  if (!parsed.success) return;

  await saveSettings("general", parsed.data, admin.email);
  await recordAudit(
    admin,
    "settings.general.updated",
    null,
    `maintenance=${parsed.data.maintenanceMode}, inscriptions=${parsed.data.registrationOpen}`,
  );
  revalidatePath("/", "layout");
}

/** Enregistre les réglages d'ingestion (fraîcheur, purge, activation). */
export async function saveIngestionSettings(form: FormData): Promise<void> {
  const admin = await requireAdminAction();

  const parsed = ingestionSettingsSchema.safeParse({
    freshnessDays: text(form, "freshnessDays"),
    maxAgeDays: text(form, "maxAgeDays"),
    ingestionEnabled: checkbox(form, "ingestionEnabled"),
  });
  if (!parsed.success) return;

  await saveSettings("ingestion", parsed.data, admin.email);
  await recordAudit(admin, "settings.ingestion.updated", null);
  revalidatePath("/admin/parametres");
}

// ------------------------------------------------------------ Ingestion

/**
 * Déclenche un cycle d'ingestion immédiat, sans attendre le cron.
 * L'exécution complète dure plusieurs minutes : on la lance en arrière-plan et
 * on rend la main tout de suite ; le résultat apparaît dans `/admin/sources`.
 */
export async function triggerIngestion(): Promise<void> {
  const admin = await requireAdminAction();

  void runIngestion().catch((err) => {
    console.error("[admin] Ingestion manuelle échouée :", err);
  });

  await recordAudit(admin, "ingestion.triggered", null, "Lancement manuel depuis le panneau");
  revalidatePath("/admin/sources");
}

/** Ré-indexe toutes les offres actives dans Meilisearch (réparation d'index). */
export async function reindexSearch(): Promise<void> {
  const admin = await requireAdminAction();

  const offers = await prisma.jobOffer.findMany({
    where: { status: "ACTIVE" },
    include: { company: true },
  });
  try {
    await syncOffersToSearch(offers);
  } catch (err) {
    console.error("[admin] Ré-indexation échouée :", err);
  }

  await recordAudit(admin, "search.reindexed", null, `${offers.length} offre(s)`);
  revalidatePath("/admin/sources");
}

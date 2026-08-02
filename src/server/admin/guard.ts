import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Contrôle d'accès du panneau d'administration.
 *
 * Le rôle porté par le JWT sert de filtre rapide, mais **toute action d'écriture
 * revalide le rôle en base** : un token émis avant une rétrogradation ne doit
 * pas continuer à ouvrir les portes pendant sa durée de vie.
 */

export type AdminActor = { id: string; email: string; name: string | null };

/** L'administrateur courant, ou `null` si la session n'est pas (ou plus) admin. */
export async function currentAdmin(): Promise<AdminActor | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || session?.user?.role !== "ADMIN") return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, suspendedAt: true },
  });
  if (!user || user.role !== "ADMIN" || user.suspendedAt) return null;

  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Version pour les pages : redirige vers la connexion (ou l'accueil) au lieu de
 * lever. `callbackUrl` ramène l'administrateur là où il allait après login.
 */
export async function requireAdminPage(callbackUrl = "/admin"): Promise<AdminActor> {
  const session = await auth();
  if (!session?.user) redirect(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const admin = await currentAdmin();
  if (!admin) redirect("/");
  return admin;
}

/** Version pour les Server Actions : lève si l'appelant n'est pas administrateur. */
export async function requireAdminAction(): Promise<AdminActor> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Action réservée aux administrateurs.");
  return admin;
}

import type { Metadata } from "next";
import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, StatCard, Th } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { currentAdmin } from "@/server/admin/guard";
import {
  deleteUser,
  setUserPassword,
  toggleUserRole,
  toggleUserSuspension,
  verifyUserEmail,
} from "@/server/admin/actions";

export const metadata: Metadata = { title: "Admin — Utilisateurs" };

const PAGE_SIZE = 25;

/** Gestion des comptes : rôle, suspension, vérification, mot de passe, suppression. */
export default async function AdminUsersPage({
  searchParams: pendingSearchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; role?: string; etat?: string }>;
}) {
  const searchParams = await pendingSearchParams;
  const admin = await currentAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim() ?? "";
  const role =
    searchParams.role === "ADMIN"
      ? Role.ADMIN
      : searchParams.role === "USER"
        ? Role.USER
        : undefined;
  const etat = searchParams.etat === "suspendus" ? "suspendus" : undefined;

  const where = {
    ...(role ? { role } : {}),
    ...(etat === "suspendus" ? { suspendedAt: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total, adminCount, suspendedCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        suspendedAt: true,
        emailVerified: true,
        createdAt: true,
        school: true,
        _count: { select: { savedOffers: true, applyClicks: true, savedSearches: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (etat) params.set("etat", etat);
    params.set("page", String(n));
    return params.toString();
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Comptes au total" value={total} />
        <StatCard label="Administrateurs" value={adminCount} tone="accent" />
        <StatCard
          label="Comptes suspendus"
          value={suspendedCount}
          tone={suspendedCount > 0 ? "warn" : "neutral"}
        />
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <div className="flex-1 sm:max-w-xs">
          <label htmlFor="q" className="field-label">
            Recherche
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="input-ink"
            placeholder="Email, nom ou identifiant"
          />
        </div>
        <div>
          <label htmlFor="role" className="field-label">
            Rôle
          </label>
          <select id="role" name="role" defaultValue={role ?? ""} className="input-ink !w-auto">
            <option value="">Tous</option>
            <option value="ADMIN">Administrateurs</option>
            <option value="USER">Utilisateurs</option>
          </select>
        </div>
        <div>
          <label htmlFor="etat" className="field-label">
            État
          </label>
          <select id="etat" name="etat" defaultValue={etat ?? ""} className="input-ink !w-auto">
            <option value="">Tous</option>
            <option value="suspendus">Suspendus</option>
          </select>
        </div>
        <button type="submit" className="btn-outline">
          Filtrer
        </button>
      </form>

      <div className="table-shell mt-4">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <thead>
            <tr className="border-b border-line bg-surface/50 text-left">
              <Th>Compte</Th>
              <Th>Rôle</Th>
              <Th>État</Th>
              <Th>Activité</Th>
              <Th>Inscrit le</Th>
              <Th className="pr-0">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === admin?.id;
              return (
                <tr key={user.id} className="border-b border-line align-top">
                  <td className="max-w-[260px] py-3 pr-4">
                    <p className="truncate font-semibold">{user.name ?? "—"}</p>
                    <p className="truncate text-xs text-ink/60">{user.email}</p>
                    {user.username && (
                      <p className="truncate text-xs text-ink/60">@{user.username}</p>
                    )}
                    {user.school && <p className="truncate text-xs text-ink/60">{user.school}</p>}
                  </td>
                  <td className="py-3 pr-4">
                    {user.role === "ADMIN" ? (
                      <Badge tone="accent">Admin</Badge>
                    ) : (
                      <Badge>Utilisateur</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col items-start gap-1">
                      {user.suspendedAt ? (
                        <Badge tone="danger">Suspendu</Badge>
                      ) : (
                        <Badge>Actif</Badge>
                      )}
                      {!user.emailVerified && <Badge tone="danger">Email non vérifié</Badge>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-ink/60">
                    {user._count.savedOffers} favori(s)
                    <br />
                    {user._count.applyClicks} clic(s)
                    <br />
                    {user._count.savedSearches} alerte(s)
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-ink/70">
                    {user.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 pr-4">
                    {isSelf ? (
                      <p className="text-xs text-ink/60">
                        Votre compte — actions désactivées par sécurité.
                      </p>
                    ) : (
                      <div className="flex flex-col items-start gap-1.5">
                        <form action={toggleUserRole.bind(null, user.id)}>
                          <button type="submit" className="link text-sm">
                            {user.role === "ADMIN" ? "Retirer l'accès admin" : "Passer admin"}
                          </button>
                        </form>
                        <form action={toggleUserSuspension.bind(null, user.id)}>
                          <button type="submit" className="link text-sm">
                            {user.suspendedAt ? "Réactiver" : "Suspendre"}
                          </button>
                        </form>
                        {!user.emailVerified && (
                          <form action={verifyUserEmail.bind(null, user.id)}>
                            <button type="submit" className="link text-sm">
                              Valider l&apos;email
                            </button>
                          </form>
                        )}
                        <form
                          action={setUserPassword.bind(null, user.id)}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="password"
                            name="password"
                            minLength={8}
                            required
                            placeholder="Nouveau mot de passe"
                            aria-label={`Nouveau mot de passe pour ${user.email}`}
                            className="input-ink !min-h-[34px] !w-40 !py-1 text-xs"
                          />
                          <button type="submit" className="link text-xs">
                            Définir
                          </button>
                        </form>
                        <form action={deleteUser.bind(null, user.id)}>
                          <ConfirmButton
                            message={`Supprimer définitivement le compte ${user.email} et toutes ses données ?`}
                          >
                            Supprimer
                          </ConfirmButton>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/60">
                  Aucun compte ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination des utilisateurs"
          className="rule mt-4 flex items-center gap-4 pt-3 text-sm"
        >
          {page > 1 && (
            <Link href={`/admin/utilisateurs?${pageParams(page - 1)}`} className="link">
              ← Précédent
            </Link>
          )}
          <span className="text-ink/60">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/utilisateurs?${pageParams(page + 1)}`} className="link">
              Suivant →
            </Link>
          )}
        </nav>
      )}

      <p className="mt-6 text-xs text-ink/60">
        Le dernier compte administrateur actif ne peut être ni rétrogradé, ni suspendu, ni supprimé
        : c&apos;est ce qui garantit qu&apos;il reste toujours un accès à cette console.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Admin — Journal d'audit" };

const PAGE_SIZE = 50;

/** Libellés lisibles des actions journalisées. */
const ACTION_LABELS: Record<string, string> = {
  "offer.deactivated": "Offre désactivée",
  "offer.reactivated": "Offre réactivée",
  "offer.deleted": "Offre supprimée",
  "company.featured": "Entreprise mise en avant",
  "company.unfeatured": "Entreprise retirée de l'accueil",
  "company.deleted": "Entreprise supprimée",
  "user.role.changed": "Rôle modifié",
  "user.suspended": "Compte suspendu",
  "user.reinstated": "Compte réactivé",
  "user.email.verified": "Email validé",
  "user.password.reset": "Mot de passe redéfini",
  "user.deleted": "Compte supprimé",
  "settings.seo.updated": "Réglages SEO modifiés",
  "settings.general.updated": "Paramètres du site modifiés",
  "settings.ingestion.updated": "Paramètres d'ingestion modifiés",
  "ingestion.triggered": "Ingestion lancée",
  "search.reindexed": "Recherche ré-indexée",
  "admin.account.created": "Compte administrateur créé",
  "admin.account.updated": "Compte administrateur mis à jour",
};

/** Historique complet des actions d'administration. */
export default async function AdminJournalPage({
  searchParams: pendingSearchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const searchParams = await pendingSearchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const action = searchParams.action?.trim() || undefined;

  const where = action ? { action } : {};

  const [entries, total, byAction] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = (n: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    params.set("page", String(n));
    return params.toString();
  };

  return (
    <div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="action" className="mb-1 block text-sm font-semibold">
            Type d&apos;action
          </label>
          <select id="action" name="action" defaultValue={action ?? ""} className="input-ink">
            <option value="">Toutes</option>
            {byAction.map((row) => (
              <option key={row.action} value={row.action}>
                {ACTION_LABELS[row.action] ?? row.action} ({row._count})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline !min-h-[44px]">
          Filtrer
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/70">
        {total} entrée{total > 1 ? "s" : ""}
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left">
              <Th>Date</Th>
              <Th>Auteur</Th>
              <Th>Action</Th>
              <Th>Détail</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-ink/15">
                <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-ink/70">
                  {entry.createdAt.toLocaleDateString("fr-FR")}{" "}
                  {entry.createdAt.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="max-w-[200px] truncate py-2.5 pr-4">{entry.actorEmail ?? "—"}</td>
                <td className="py-2.5 pr-4 font-semibold">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </td>
                <td className="max-w-[320px] truncate py-2.5 text-ink/70">{entry.detail ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-ink/50">
                  Aucune action journalisée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination du journal"
          className="rule mt-4 flex items-center gap-4 pt-3 text-sm"
        >
          {page > 1 && (
            <Link
              href={`/admin/journal?${pageParams(page - 1)}`}
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              ← Précédent
            </Link>
          )}
          <span className="text-ink/60">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/journal?${pageParams(page + 1)}`}
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { Badge, SectionTitle, StatCard, Th } from "@/components/admin/ui";
import { reindexSearch, triggerIngestion } from "@/server/admin/actions";

export const metadata: Metadata = { title: "Admin — Tableau de bord" };

/** Vue d'ensemble : santé du catalogue, de l'audience et de l'ingestion. */
export default async function AdminDashboardPage() {
  const since24h = new Date(Date.now() - 86_400_000);
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [
    activeOffers,
    expiredOffers,
    newOffers24h,
    companies,
    users,
    admins,
    suspended,
    clicks7d,
    savedSearches,
    lastRuns,
    general,
    ingestion,
  ] = await Promise.all([
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.jobOffer.count({ where: { status: "EXPIRED" } }),
    prisma.jobOffer.count({ where: { createdAt: { gte: since24h } } }),
    prisma.company.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.applyClick.count({ where: { clickedAt: { gte: since7d } } }),
    prisma.savedSearch.count(),
    prisma.ingestRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 }),
    getSettings("general"),
    getSettings("ingestion"),
  ]);

  return (
    <div>
      {(general.maintenanceMode || !ingestion.ingestionEnabled || !general.registrationOpen) && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/40"
        >
          <span className="font-semibold">Mode dégradé actif :</span>
          {general.maintenanceMode && <Badge tone="danger">Site en maintenance</Badge>}
          {!general.registrationOpen && <Badge tone="danger">Inscriptions fermées</Badge>}
          {!ingestion.ingestionEnabled && <Badge tone="danger">Ingestion suspendue</Badge>}
          <Link
            href="/admin/parametres"
            className="ml-auto font-semibold text-cobalt underline-offset-4 hover:underline"
          >
            Modifier →
          </Link>
        </div>
      )}

      <section aria-labelledby="kpi">
        <h2 id="kpi" className="sr-only">
          Indicateurs
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Offres actives" value={activeOffers} tone="accent" />
          <StatCard label="Offres expirées" value={expiredOffers} />
          <StatCard label="Nouvelles (24 h)" value={newOffers24h} hint="Créées par l'ingestion" />
          <StatCard label="Entreprises" value={companies} />
          <StatCard label="Utilisateurs" value={users} hint={`${admins} administrateur(s)`} />
          <StatCard
            label="Comptes suspendus"
            value={suspended}
            tone={suspended > 0 ? "warn" : "neutral"}
          />
          <StatCard label="Clics Postuler (7 j)" value={clicks7d} />
          <StatCard label="Alertes enregistrées" value={savedSearches} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="actions">
        <SectionTitle
          id="actions"
          title="Actions rapides"
          description="Opérations ponctuelles, sans attendre les crons."
        />
        <div className="flex flex-wrap gap-3">
          <form action={triggerIngestion}>
            <button type="submit" className="btn-cobalt !min-h-[40px] !px-4 !py-1.5 text-sm">
              Lancer une ingestion
            </button>
          </form>
          <form action={reindexSearch}>
            <button type="submit" className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm">
              Ré-indexer la recherche
            </button>
          </form>
          <Link
            href="/admin/offres?statut=ACTIVE"
            className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm"
          >
            Modérer les offres
          </Link>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="runs">
        <SectionTitle
          id="runs"
          title="Derniers passages d'ingestion"
          description="Une ligne par source et par cycle : volume récupéré, résultat, durée."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <Th>Date</Th>
                <Th>Source</Th>
                <Th>Récupérées</Th>
                <Th>Créées</Th>
                <Th>Doublons</Th>
                <Th>Durée</Th>
                <Th>État</Th>
              </tr>
            </thead>
            <tbody>
              {lastRuns.map((run) => (
                <tr key={run.id} className="border-b border-ink/15">
                  <td className="py-2.5 pr-4 tabular-nums text-ink/70">
                    {run.startedAt.toLocaleDateString("fr-FR")}{" "}
                    {run.startedAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold">{run.label}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{run.fetched}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{run.created}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink/60">{run.duplicates}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink/60">
                    {(run.durationMs / 1000).toFixed(1)} s
                  </td>
                  <td className="py-2.5">
                    {run.ok ? (
                      <Badge tone="accent">OK</Badge>
                    ) : (
                      <Badge tone="danger" title={run.error ?? undefined}>
                        Échec
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {lastRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink/50">
                    Aucun cycle d&apos;ingestion enregistré pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

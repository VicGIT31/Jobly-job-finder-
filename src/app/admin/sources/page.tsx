import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge, SectionTitle, Th } from "@/components/admin/ui";
import { reindexSearch, triggerIngestion } from "@/server/admin/actions";
import { loadSourceCatalog } from "@/server/ingest/sources/catalog";
import type { Prisma } from "@prisma/client";
import { STUDENT_OFFER_WHERE } from "@/server/offers/public-scope";

export const metadata: Metadata = { title: "Admin — Sources & ingestion" };

/** Gestion des sources : volume d'offres, état, stats de clics « Postuler » par source. */
export default async function AdminSourcesPage() {
  const since24h = new Date(Date.now() - 86_400_000);
  const [runs, logs, catalog] = await Promise.all([
    prisma.ingestRun.findMany({
      where: { startedAt: { gte: since24h } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.ingestLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    loadSourceCatalog(),
  ]);

  // Santé par source sur 24 h : un connecteur qui échoue en boucle doit se voir.
  const health = new Map<
    string,
    {
      label: string;
      runs: number;
      failures: number;
      created: number;
      fetched: number;
      error: string | null;
      coverage: Prisma.JsonValue | null;
      latestOk: boolean;
      latestFetched: number;
    }
  >();
  for (const run of runs) {
    if (run.startedAt < since24h) continue;
    const key = `${run.sourceSite}|${run.label}`;
    const entry = health.get(key) ?? {
      label: run.label,
      runs: 0,
      failures: 0,
      created: 0,
      fetched: 0,
      error: run.error,
      coverage: run.coverageJson,
      latestOk: run.ok,
      latestFetched: run.fetched,
    };
    entry.runs++;
    if (!run.ok) entry.failures++;
    entry.created += run.created;
    entry.fetched += run.fetched;
    health.set(key, entry);
  }

  const [bySource, clicksBySource, last30d] = await Promise.all([
    prisma.jobOffer.groupBy({
      by: ["sourceSite", "status"],
      where: STUDENT_OFFER_WHERE,
      _count: true,
    }),
    prisma.applyClick.groupBy({
      by: ["offerId"],
      _count: true,
    }),
    prisma.applyClick.count({
      where: { clickedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    }),
  ]);

  // Agrégation clics par source (jointure offerId → sourceSite)
  const offerSources = await prisma.jobOffer.findMany({
    where: { id: { in: clicksBySource.map((c) => c.offerId) } },
    select: { id: true, sourceSite: true },
  });
  const sourceByOffer = new Map(offerSources.map((o) => [o.id, o.sourceSite]));

  const clickTotals = new Map<string, number>();
  for (const row of clicksBySource) {
    const source = sourceByOffer.get(row.offerId);
    if (!source) continue;
    clickTotals.set(source, (clickTotals.get(source) ?? 0) + row._count);
  }

  const sources = new Map<string, { active: number; expired: number; clicks: number }>();
  for (const row of bySource) {
    const entry = sources.get(row.sourceSite) ?? { active: 0, expired: 0, clicks: 0 };
    if (row.status === "ACTIVE") entry.active += row._count;
    else entry.expired += row._count;
    entry.clicks = clickTotals.get(row.sourceSite) ?? 0;
    sources.set(row.sourceSite, entry);
  }

  const rows = [...sources.entries()].sort((a, b) => b[1].clicks - a[1].clicks);
  const totalClicks = [...clickTotals.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">{rows.length}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Sources actives</p>
        </div>
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">{totalClicks}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">
            Clics « Postuler » (total)
          </p>
        </div>
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">{last30d}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Clics sur 30 jours</p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="sources-titre">
        <h2 id="sources-titre" className="font-display text-xl font-bold">
          Performance par source
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th
                  scope="col"
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Source
                </th>
                <th
                  scope="col"
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Offres actives
                </th>
                <th
                  scope="col"
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Expirées
                </th>
                <th
                  scope="col"
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Clics Postuler
                </th>
                <th
                  scope="col"
                  className="py-2 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Clics / offre
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([source, stats]) => {
                const totalOffers = stats.active + stats.expired;
                return (
                  <tr key={source} className="border-b border-ink/15">
                    <td className="py-2.5 pr-4 font-semibold">{source}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{stats.active}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-ink/60">{stats.expired}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{stats.clicks}</td>
                    <td className="py-2.5 tabular-nums">
                      {totalOffers > 0 ? (stats.clicks / totalOffers).toFixed(1) : "0"}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink/50">
                    Aucune source pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/50">
          Les sources sont créées automatiquement à l&apos;ingestion (champ <code>sourceSite</code>{" "}
          de <code>POST /internal/ingest</code>). Pour couper une source, désactivez ses offres dans
          la modération.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="sante">
        <details className="card mb-6 p-4">
          <summary className="cursor-pointer font-semibold">
            Catalogue : {catalog.filter((s) => s.enabled).length} sources activées ·{" "}
            {new Set(catalog.filter((s) => s.company).map((s) => s.company)).size} entreprises
          </summary>
          <p className="mt-2 text-sm text-ink/70">
            Une source activée est interrogée automatiquement. Elle peut ne publier aucun stage tech
            en France ou refuser la collecte. L&apos;état réel du dernier passage apparaît
            ci-dessous.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr>
                  <Th>Source</Th>
                  <Th>Format</Th>
                  <Th>Collecte</Th>
                  <Th>Site carrière</Th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((source) => (
                  <tr key={source.id} className="border-t border-ink/15">
                    <td className="py-2 pr-4 font-semibold">{source.label}</td>
                    <td className="py-2 pr-4">{source.kind}</td>
                    <td className="py-2 pr-4">{source.enabled ? "Activée" : "Désactivée"}</td>
                    <td className="py-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cobalt underline underline-offset-4"
                      >
                        Voir {source.label}
                        <span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <SectionTitle
          id="sante"
          title="Santé des connecteurs (24 h)"
          description="Taux d'échec par source. Un connecteur qui échoue en boucle signale un endpoint cassé ou un rate-limit."
        />
        <div className="flex flex-wrap gap-3">
          <form action={triggerIngestion}>
            <button type="submit" className="btn-cobalt !min-h-[40px] !px-4 !py-1.5 text-sm">
              Lancer une ingestion maintenant
            </button>
          </form>
          <form action={reindexSearch}>
            <button type="submit" className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm">
              Ré-indexer la recherche
            </button>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <Th>Connecteur</Th>
                <Th>Cycles</Th>
                <Th>Échecs</Th>
                <Th>Offres créées</Th>
                <Th>Dernier catalogue parcouru</Th>
                <Th>État</Th>
              </tr>
            </thead>
            <tbody>
              {[...health.entries()].map(([source, stats]) => (
                <tr key={source} className="border-b border-ink/15">
                  <td className="py-2.5 pr-4 font-semibold">
                    {stats.label}
                    {stats.error && (
                      <p className="mt-1 max-w-md text-xs font-normal text-ink/60">{stats.error}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{stats.runs}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{stats.failures}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{stats.created}</td>
                  <td className="py-2.5 pr-4 text-xs">{coverageLabel(stats.coverage)}</td>
                  <td className="py-2.5">
                    {stats.latestOk ? (
                      <Badge tone="accent">Collecte réussie</Badge>
                    ) : stats.latestFetched > 0 ? (
                      <Badge>Collecte partielle</Badge>
                    ) : (
                      <Badge tone="danger">En panne</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {health.size === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink/50">
                    Aucun cycle sur les dernières 24 heures.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="journal-ingestion">
        <SectionTitle
          id="journal-ingestion"
          title="Derniers événements d'ingestion"
          description="Offre par offre : création, doublon rafraîchi ou rejet (hors périmètre, données invalides)."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <Th>Date</Th>
                <Th>Source</Th>
                <Th>Résultat</Th>
                <Th>Détail</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-ink/15">
                  <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-ink/70">
                    {log.createdAt.toLocaleDateString("fr-FR")}{" "}
                    {log.createdAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-4">{log.sourceSite}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={log.result === "CREATED" ? "accent" : "neutral"}>
                      {RESULT_LABELS[log.result] ?? log.result}
                    </Badge>
                  </td>
                  <td className="max-w-[280px] truncate py-2 text-ink/70">
                    {log.rawTitle ?? "—"}
                    {log.message ? ` · ${log.message}` : ""}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink/50">
                    Aucun log d&apos;ingestion.
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

const RESULT_LABELS: Record<string, string> = {
  CREATED: "Créée",
  UPDATED: "Mise à jour",
  DUPLICATE: "Doublon",
  REJECTED: "Rejetée",
};

function coverageLabel(value: Prisma.JsonValue | null): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Non mesuré";
  const { listingsSeen, catalogTotal, accepted, complete } = value;
  if (
    typeof listingsSeen !== "number" ||
    typeof catalogTotal !== "number" ||
    typeof accepted !== "number"
  )
    return "Non mesuré";
  return `${listingsSeen}/${catalogTotal} annonces parcourues · ${accepted} tech étudiant · ${complete === true ? "parcours complet" : "parcours partiel"}`;
}

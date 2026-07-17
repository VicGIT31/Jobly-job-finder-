import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin — Sources & clics" };

/** Gestion des sources : volume d'offres, état, stats de clics « Postuler » par source. */
export default async function AdminSourcesPage() {
  const [bySource, clicksBySource, last30d] = await Promise.all([
    prisma.jobOffer.groupBy({
      by: ["sourceSite", "status"],
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
        <div className="border border-ink p-4">
          <p className="font-display text-3xl font-black tabular-nums">{rows.length}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Sources actives</p>
        </div>
        <div className="border border-ink p-4">
          <p className="font-display text-3xl font-black tabular-nums">{totalClicks}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">
            Clics « Postuler » (total)
          </p>
        </div>
        <div className="border border-ink p-4">
          <p className="font-display text-3xl font-black tabular-nums">{last30d}</p>
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
              <tr className="border-b-2 border-ink text-left">
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">
                  Offres actives
                </th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">
                  Expirées
                </th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">
                  Clics Postuler
                </th>
                <th scope="col" className="py-2 font-bold uppercase tracking-wider">
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
          Les sources sont créées automatiquement à l'ingestion (champ <code>sourceSite</code> de{" "}
          <code>POST /internal/ingest</code>). Pour couper une source, désactivez ses offres dans la
          modération.
        </p>
      </section>
    </div>
  );
}

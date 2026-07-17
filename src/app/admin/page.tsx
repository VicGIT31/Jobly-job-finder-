import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin — Ingestion" };

const RESULT_LABELS: Record<string, string> = {
  CREATED: "Créées",
  UPDATED: "Mises à jour",
  DUPLICATE: "Doublons rejetés",
  REJECTED: "Rejets (invalides)",
};

/** Tableau de bord ingestion : offres/jour, doublons, expirations. */
export default async function AdminIngestionPage() {
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [totalActive, totalExpired, logsByResult, recentLogs, perDay] = await Promise.all([
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.jobOffer.count({ where: { status: "EXPIRED" } }),
    prisma.ingestLog.groupBy({ by: ["result"], _count: true }),
    prisma.ingestLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.$queryRaw<Array<{ day: Date; created: bigint; duplicates: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day,
             count(*) FILTER (WHERE result = 'CREATED') AS created,
             count(*) FILTER (WHERE result = 'DUPLICATE') AS duplicates
      FROM ingest_logs
      WHERE "createdAt" >= ${since7d}
      GROUP BY 1
      ORDER BY 1 DESC
    `,
  ]);

  const counts = Object.fromEntries(logsByResult.map((row) => [row.result, row._count]));

  return (
    <div>
      <section aria-labelledby="stats-titre">
        <h2 id="stats-titre" className="sr-only">
          Statistiques
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Offres actives" value={totalActive} />
          <StatCard label="Offres expirées" value={totalExpired} />
          <StatCard label="Doublons rejetés" value={counts.DUPLICATE ?? 0} />
          <StatCard label="Rejets (invalides)" value={counts.REJECTED ?? 0} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="jour-titre">
        <h2 id="jour-titre" className="font-display text-xl font-bold">
          Ingestion des 7 derniers jours
        </h2>
        {perDay.length === 0 ? (
          <p className="mt-3 border border-dashed border-ink/40 p-6 text-center text-sm text-ink/60">
            Aucune ingestion sur la période. Envoyez des offres sur{" "}
            <code className="bg-ink/10 px-1">POST /internal/ingest</code>.
          </p>
        ) : (
          <table className="mt-3 w-full max-w-lg border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">Jour</th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">Créées</th>
                <th scope="col" className="py-2 font-bold uppercase tracking-wider">Doublons</th>
              </tr>
            </thead>
            <tbody>
              {perDay.map((row) => (
                <tr key={row.day.toISOString()} className="border-b border-ink/15">
                  <td className="py-2 pr-4">{row.day.toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 pr-4 tabular-nums">{Number(row.created)}</td>
                  <td className="py-2 tabular-nums">{Number(row.duplicates)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8" aria-labelledby="logs-titre">
        <h2 id="logs-titre" className="font-display text-xl font-bold">
          Derniers événements d'ingestion
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">Date</th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">Source</th>
                <th scope="col" className="py-2 pr-4 font-bold uppercase tracking-wider">Résultat</th>
                <th scope="col" className="py-2 font-bold uppercase tracking-wider">Détail</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-ink/15">
                  <td className="py-2 pr-4 tabular-nums text-ink/70">
                    {log.createdAt.toLocaleDateString("fr-FR")}{" "}
                    {log.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 pr-4">{log.sourceSite}</td>
                  <td className="py-2 pr-4">
                    <span className="stamp !text-[10px]">{RESULT_LABELS[log.result] ?? log.result}</span>
                  </td>
                  <td className="max-w-[280px] truncate py-2 text-ink/70">
                    {log.rawTitle ?? "—"}
                    {log.message ? ` · ${log.message}` : ""}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-ink/50">
                    Aucun log d'ingestion.
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink p-4">
      <p className="font-display text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">{label}</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeInsights } from "@/server/insights/compute";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

function pct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/mon-espace/insights");

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    select: { createdAt: true, history: { select: { status: true, changedAt: true } } },
  });

  const insights = computeInsights(applications);
  const maxFunnel = insights.funnel[0]?.count ?? 0;

  if (!insights.hasEnoughData) {
    return (
      <section aria-labelledby="insights-titre">
        <h2 id="insights-titre" className="font-display text-xl font-bold">
          Insights
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink/70">
            Pas encore assez de candidatures pour des statistiques fiables. Revenez après quelques
            candidatures de plus.
          </p>
          <Link href="/mon-espace/candidatures" className="btn-cobalt mt-4">
            Voir mes candidatures
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="insights-titre">
      <h2 id="insights-titre" className="font-display text-xl font-bold">
        Insights
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Basé sur {insights.total} candidature{insights.total > 1 ? "s" : ""} suivie
        {insights.total > 1 ? "s" : ""}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">
            {insights.thisWeek.applications}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">
            Candidatures cette semaine
          </p>
        </div>
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">
            {insights.thisWeek.interviews}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">
            Entretiens cette semaine
          </p>
        </div>
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums">{insights.thisWeek.offers}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Offres cette semaine</p>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h3 className="font-display text-lg font-bold">Entonnoir</h3>
        <div className="mt-4 space-y-3">
          {insights.funnel.map((step) => (
            <div key={step.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="tabular-nums text-ink/60">{step.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-cobalt"
                  style={{ width: maxFunnel > 0 ? `${(step.count / maxFunnel) * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums text-cobalt">
            {pct(insights.responseRate)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Taux de réponse</p>
          <p className="mt-1 text-xs text-ink/45">
            Part des candidatures ayant eu un retour (test, entretien, offre ou refus).
          </p>
        </div>
        <div className="card p-4">
          <p className="font-display text-3xl font-bold tabular-nums text-cobalt">
            {pct(insights.interviewRate)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">Taux d'entretien</p>
          <p className="mt-1 text-xs text-ink/45">
            Part des candidatures ayant mené à au moins un entretien.
          </p>
        </div>
      </div>
    </section>
  );
}

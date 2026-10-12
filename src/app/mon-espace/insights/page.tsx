import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeInsights } from "@/server/insights/compute";
import { BarChart3 } from "lucide-react";
import { AccountEmptyState, SectionHeader } from "@/components/account/section-header";

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
        <SectionHeader
          id="insights-titre"
          title="Insights"
          description="Vos statistiques de candidature, calculées à partir de votre suivi."
        />
        <AccountEmptyState
          icon={<BarChart3 aria-hidden="true" size={22} />}
          title="Pas encore assez de données"
          action={
            <Link href="/mon-espace/candidatures" className="btn-cobalt">
              Voir mes candidatures
            </Link>
          }
        >
          Pas encore assez de candidatures pour des statistiques fiables. Revenez après quelques
          candidatures de plus.
        </AccountEmptyState>
      </section>
    );
  }

  const weekStats = [
    { label: "Candidatures cette semaine", value: insights.thisWeek.applications },
    { label: "Entretiens cette semaine", value: insights.thisWeek.interviews },
    { label: "Offres cette semaine", value: insights.thisWeek.offers },
  ];

  const rates = [
    {
      label: "Taux de réponse",
      value: pct(insights.responseRate),
      hint: "Part des candidatures ayant eu un retour (test, entretien, offre ou refus).",
    },
    {
      label: "Taux d'entretien",
      value: pct(insights.interviewRate),
      hint: "Part des candidatures ayant mené à au moins un entretien.",
    },
  ];

  return (
    <section aria-labelledby="insights-titre">
      <SectionHeader
        id="insights-titre"
        title="Insights"
        description={
          <>
            Basé sur {insights.total} candidature{insights.total > 1 ? "s" : ""} suivie
            {insights.total > 1 ? "s" : ""}.
          </>
        }
      />

      <dl className="mt-6 grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-paper shadow-card sm:grid-cols-3">
        {weekStats.map((stat, i) => (
          <div
            key={stat.label}
            className={`p-5 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}
          >
            <dt className="eyebrow">{stat.label}</dt>
            <dd className="mt-3 font-mono text-4xl font-semibold tabular-nums tracking-[-0.04em]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="panel mt-4">
        <h3 className="text-base font-semibold tracking-tight">Entonnoir</h3>
        <p className="mt-0.5 text-xs text-ink/60">Du suivi de l&apos;offre à la proposition.</p>
        <ol className="mt-5 space-y-4">
          {insights.funnel.map((step, i) => {
            const width = maxFunnel > 0 ? (step.count / maxFunnel) * 100 : 0;
            return (
              <li key={step.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="font-mono text-2xs text-ink/60">0{i + 1}</span>
                    {step.label}
                  </span>
                  <span className="font-mono tabular-nums text-ink/60">{step.count}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-slow ease-out"
                    style={{ width: `${width}%`, opacity: 1 - i * 0.12 }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rates.map((rate) => (
          <div key={rate.label} className="panel">
            <p className="eyebrow">{rate.label}</p>
            <p className="mt-3 font-mono text-4xl font-semibold tabular-nums tracking-[-0.04em] text-accent">
              {rate.value}
            </p>
            <p className="mt-2 text-xs text-ink/60">{rate.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

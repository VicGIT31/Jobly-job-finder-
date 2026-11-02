import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSearchParams } from "@/server/alerts/match";
import { deleteAlert, updateAlertFrequency } from "@/server/account/actions";
import { CONTRACT_LABELS, EDUCATION_LABELS, REMOTE_LABELS } from "@/lib/search-params";
import { ArrowRight, Bell, Trash2 } from "lucide-react";
import { AccountEmptyState, SectionHeader } from "@/components/account/section-header";

export const metadata: Metadata = { title: "Mes recherches sauvegardées" };

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  NEVER: "En pause",
};

function alertQueryString(params: ReturnType<typeof parseSearchParams>): string {
  if (params.queryString !== undefined) return params.queryString;
  const qs = new URLSearchParams();
  qs.set("univers", "TECH");
  qs.set("national", "1");
  if (params.q) qs.set("q", params.q);
  if (params.city) qs.set("ville", params.city);
  if (params.contractType?.length) qs.set("contrat", params.contractType.join(","));
  if (params.remotePolicy?.length) qs.set("remote", params.remotePolicy.join(","));
  if (params.educationLevel?.length) qs.set("niveau", params.educationLevel.join(","));
  if (params.sector?.length) qs.set("secteur", params.sector.join(","));
  return qs.toString();
}

function describeAlert(params: ReturnType<typeof parseSearchParams>): string[] {
  const parts: string[] = [];
  if (params.q) parts.push(`« ${params.q} »`);
  if (params.contractType?.length) {
    parts.push(
      params.contractType
        .map((c) => CONTRACT_LABELS[c as keyof typeof CONTRACT_LABELS] ?? c)
        .join(", "),
    );
  }
  if (params.city) parts.push(params.city);
  if (params.remotePolicy?.length) {
    parts.push(
      params.remotePolicy
        .map((r) => REMOTE_LABELS[r as keyof typeof REMOTE_LABELS] ?? r)
        .join(", "),
    );
  }
  if (params.educationLevel?.length) {
    parts.push(
      params.educationLevel
        .map((e) => EDUCATION_LABELS[e as keyof typeof EDUCATION_LABELS] ?? e)
        .join(", "),
    );
  }
  if (params.sector?.length) parts.push(params.sector.join(", "));
  return parts.length ? parts : ["Toutes les offres"];
}

export default async function AlertesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const alerts = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section aria-labelledby="alertes-titre">
      <SectionHeader
        id="alertes-titre"
        title={
          <>
            {alerts.length} recherche{alerts.length > 1 ? "s" : ""}
          </>
        }
        description={
          <>
            Enregistrez une recherche en un clic depuis n&apos;importe quelle{" "}
            <Link href="/offres" className="link">
              recherche filtrée
            </Link>
            . Les critères sont conservés sur cet ordinateur. Les alertes activées apparaissent dans les messages locaux.
          </>
        }
      />

      {alerts.length === 0 ? (
        <AccountEmptyState
          icon={<Bell aria-hidden="true" size={22} />}
          title="Aucune alerte pour le moment"
          action={
            <Link href="/offres" className="btn-cobalt">
              Lancer une recherche
            </Link>
          }
        >
          Filtrez les offres puis cliquez « Enregistrer la recherche » pour être prévenu·e des nouveautés.
        </AccountEmptyState>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {alerts.map((alert) => {
            const params = parseSearchParams(alert.params);
            const paused = alert.frequency === "NEVER";
            return (
              <li
                key={alert.id}
                className="panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      paused ? "bg-ink/[0.06] text-ink/60" : "bg-volt text-volt-ink"
                    }`}
                  >
                    <Bell aria-hidden="true" size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">{alert.name}</p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {describeAlert(params).map((part) => (
                        <span key={part} className="ticket !min-h-[26px] !py-0.5 text-xs">
                          {part}
                        </span>
                      ))}
                    </p>
                    <p className="mt-2 font-mono text-2xs text-ink/60">
                      {alert.lastSentAt
                        ? `Dernier envoi : ${alert.lastSentAt.toLocaleDateString("fr-FR")}`
                        : "Aucun envoi pour le moment"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 lg:shrink-0 lg:border-0 lg:pt-0">
                  <Link href={`/offres?${alertQueryString(params)}`} className="btn-outline btn-sm">
                    Voir les offres
                    <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                  <form
                    className="flex items-center gap-1"
                    action={async (formData: FormData) => {
                      "use server";
                      await updateAlertFrequency(alert.id, String(formData.get("frequency")));
                    }}
                  >
                    <label htmlFor={`freq-${alert.id}`} className="sr-only">
                      Fréquence de l&apos;alerte {alert.name}
                    </label>
                    <select
                      id={`freq-${alert.id}`}
                      name="frequency"
                      defaultValue={alert.frequency}
                      className="input-ink !min-h-[36px] !w-auto !py-1 text-[13px]"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-ghost btn-sm">
                      OK
                      <span className="sr-only"> — enregistrer la fréquence</span>
                    </button>
                  </form>
                  <form action={deleteAlert.bind(null, alert.id)}>
                    <button
                      type="submit"
                      className="btn-ghost btn-sm hover:!bg-danger-soft hover:!text-danger"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                      Supprimer
                      <span className="sr-only"> l&apos;alerte {alert.name}</span>
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

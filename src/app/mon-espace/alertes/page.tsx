import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSearchParams } from "@/server/alerts/match";
import { deleteAlert, updateAlertFrequency } from "@/server/account/actions";
import { CONTRACT_LABELS, EDUCATION_LABELS, REMOTE_LABELS } from "@/lib/search-params";

export const metadata: Metadata = { title: "Mes alertes" };

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  NEVER: "En pause",
};

function alertQueryString(params: ReturnType<typeof parseSearchParams>): string {
  const qs = new URLSearchParams();
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
      <h2 id="alertes-titre" className="font-display text-xl font-bold">
        {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Créez une alerte en un clic depuis n'importe quelle{" "}
        <Link href="/offres" className="text-cobalt underline-offset-4 hover:underline">
          recherche filtrée
        </Link>
        . Vous recevrez les nouvelles offres par email.
      </p>

      {alerts.length === 0 ? (
        <div className="mt-4 border border-dashed border-ink/40 p-10 text-center">
          <p className="text-ink/70">Aucune alerte pour le moment.</p>
          <Link href="/offres" className="btn-cobalt mt-4">
            Lancer une recherche
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {alerts.map((alert) => {
            const params = parseSearchParams(alert.params);
            return (
              <li
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-ink/30 p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{alert.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-1.5">
                    {describeAlert(params).map((part) => (
                      <span key={part} className="ticket text-xs">
                        {part}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    {alert.lastSentAt
                      ? `Dernier envoi : ${alert.lastSentAt.toLocaleDateString("fr-FR")}`
                      : "Aucun envoi pour le moment"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/offres?${alertQueryString(params)}`}
                    className="btn-outline !min-h-[36px] !px-3 !py-1 text-sm"
                  >
                    Voir les offres
                  </Link>
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await updateAlertFrequency(alert.id, String(formData.get("frequency")));
                    }}
                  >
                    <label htmlFor={`freq-${alert.id}`} className="sr-only">
                      Fréquence de l'alerte {alert.name}
                    </label>
                    <select
                      id={`freq-${alert.id}`}
                      name="frequency"
                      defaultValue={alert.frequency}
                      className="input-ink !min-h-[36px] !w-auto !py-1 text-sm"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="ml-1 text-sm text-cobalt underline-offset-4 hover:underline"
                    >
                      OK
                    </button>
                  </form>
                  <form action={deleteAlert.bind(null, alert.id)}>
                    <button
                      type="submit"
                      className="text-sm text-ink/50 underline-offset-4 hover:text-ink hover:underline"
                    >
                      Supprimer
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

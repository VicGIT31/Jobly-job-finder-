import Link from "next/link";
import type { OfferDocument } from "@/server/search/sync";
import { CONTRACT_LABELS, REMOTE_LABELS } from "@/lib/search-params";

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 10000 ? `${Math.round(n / 1000)} k€` : `${n.toLocaleString("fr-FR")} €`;
  const unit = (min ?? max ?? 0) >= 10000 ? "/an" : "/mois";
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ${unit}`;
  return `${fmt(min ?? max ?? 0)} ${unit}`;
}

export function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

export function OfferCard({ offer }: { offer: OfferDocument }) {
  const salary = formatSalary(offer.salaryMin, offer.salaryMax);
  const isNew = Date.now() - offer.publishedAtTs < 3 * 86_400_000;

  return (
    <article className="card group relative p-5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink/60">
            {offer.companyName}
            {isNew && (
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Nouveau
              </span>
            )}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            <Link
              href={`/offres/${offer.slug}`}
              className="after:absolute after:inset-0 group-hover:text-cobalt"
            >
              {offer.title}
            </Link>
          </h3>
        </div>
        <span
          className="stamp shrink-0"
          aria-label={`Contrat : ${CONTRACT_LABELS[offer.contractType as keyof typeof CONTRACT_LABELS] ?? offer.contractType}`}
        >
          {CONTRACT_LABELS[offer.contractType as keyof typeof CONTRACT_LABELS] ??
            offer.contractType}
        </span>
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
        <div>
          <dt className="sr-only">Ville</dt>
          <dd>{offer.city}</dd>
        </div>
        <div>
          <dt className="sr-only">Télétravail</dt>
          <dd>
            {REMOTE_LABELS[offer.remotePolicy as keyof typeof REMOTE_LABELS] ?? offer.remotePolicy}
          </dd>
        </div>
        {salary && (
          <div>
            <dt className="sr-only">Salaire</dt>
            <dd className="font-semibold text-ink">{salary}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Publiée</dt>
          <dd className="text-ink/50">{timeAgo(offer.publishedAtTs)}</dd>
        </div>
      </dl>

      <div className="rule mt-3 pt-2 text-xs text-ink/50">
        {offer.sector} · Source : {offer.sourceSite}
      </div>
    </article>
  );
}

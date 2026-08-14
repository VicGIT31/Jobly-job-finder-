import Link from "next/link";
import { Clock, Laptop, MapPin, Wallet } from "lucide-react";
import type { OfferDocument } from "@/server/search/sync";
import { CONTRACT_LABELS, COUNTRY_FLAGS, REMOTE_LABELS } from "@/lib/search-params";
import { CompanyLogo } from "./company-logo";

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 10000 ? `${Math.round(n / 1000)} k€` : `${n.toLocaleString("fr-FR")} €`;
  const unit = (min ?? max ?? 0) >= 10000 ? "/an" : "/mois";
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ${unit}`;
  return `${fmt(min ?? max ?? 0)} ${unit}`;
}

/** Date de publication (site d'origine) au format court français : "17 juil. 2026". */
export function formatDateFr(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
    <article className="card group relative p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <CompanyLogo name={offer.companyName} logoUrl={offer.companyLogo} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-ink/60">
            <span className="truncate">{offer.companyName}</span>
            {isNew && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Nouveau
              </span>
            )}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight">
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

      <dl className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink/70">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Ville</dt>
          <MapPin aria-hidden="true" size={14} className="shrink-0 text-ink/40" />
          <dd className="flex items-center gap-1">
            {offer.countryCode !== "FR" && (
              <span aria-hidden="true">{COUNTRY_FLAGS[offer.countryCode] ?? "🌍"}</span>
            )}
            {offer.city}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Télétravail</dt>
          <Laptop aria-hidden="true" size={14} className="shrink-0 text-ink/40" />
          <dd>
            {REMOTE_LABELS[offer.remotePolicy as keyof typeof REMOTE_LABELS] ?? offer.remotePolicy}
          </dd>
        </div>
        {salary && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Salaire</dt>
            <Wallet aria-hidden="true" size={14} className="shrink-0 text-ink/40" />
            <dd className="font-semibold text-ink">{salary}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Publiée le</dt>
          <Clock aria-hidden="true" size={14} className="shrink-0 text-ink/40" />
          <dd className="text-ink/50">
            <time dateTime={new Date(offer.publishedAtTs).toISOString()}>
              {formatDateFr(offer.publishedAtTs)}
            </time>{" "}
            · {timeAgo(offer.publishedAtTs)}
          </dd>
        </div>
      </dl>

      <div className="rule mt-3.5 flex items-center justify-between gap-2 pt-3">
        <span className="min-w-0 truncate text-xs text-ink/45">
          {offer.sector} · Source : {offer.sourceSite}
        </span>
        {/* z-10 pour passer au-dessus de l'overlay de la carte ; nouvel onglet vers la source. */}
        <a
          href={`/go/${offer.id}`}
          target="_blank"
          rel="nofollow noopener"
          className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-lg bg-cobalt-soft px-3 py-1.5 text-xs font-semibold text-cobalt transition-colors duration-150 group-hover:bg-cobalt group-hover:text-white"
        >
          Postuler <span aria-hidden="true">↗</span>
          <span className="sr-only">
            {offer.title} sur {offer.sourceSite}, nouvel onglet
          </span>
        </a>
      </div>
    </article>
  );
}

import Link from "next/link";
import { ArrowUpRight, Clock, Laptop, MapPin, Wallet } from "lucide-react";
import type { EducationLevel, RemotePolicy, TechSpecialty } from "@prisma/client";
import type { OfferDocument } from "@/server/search/sync";
import { COUNTRY_FLAGS, REMOTE_LABELS } from "@/lib/search-params";
import { computeMatchScore, scoreTier, type MatchCandidate } from "@/server/match/score";
import { ContractBadge } from "@/components/ui/contract-badge";
import { CompanyLogo } from "./company-logo";
import { formatDateFr, formatSalary, timeAgo } from "./format";

// Réexportés pour compatibilité : les helpers vivent dans `./format` (sans
// dépendance serveur, importables par n'importe quel composant client).
export { formatDateFr, formatSalary, timeAgo };

/**
 * Carte d'offre — deux mises en page :
 * - `row` (liste de résultats) : lecture horizontale, optimisée pour le balayage ;
 * - `tile` (grilles : accueil, entreprise, similaires).
 * Toute la carte est cliquable (lien étiré) ; « Postuler » reste un lien
 * distinct, au-dessus de l'overlay, vers la redirection `/go/:id`.
 */
export function OfferCard({
  offer,
  candidateProfile,
  layout = "tile",
  actions,
}: {
  offer: OfferDocument;
  /** Profil du candidat connecté, pour afficher le score de correspondance sur la carte (spec §11). */
  candidateProfile?: MatchCandidate | null;
  layout?: "row" | "tile";
  /** Actions secondaires (ex. « Retirer ») affichées dans le pied de carte. */
  actions?: React.ReactNode;
}) {
  const salary = formatSalary(offer.salaryMin, offer.salaryMax, offer.salaryPeriod);
  const isNew = offer.publicationKnown && Date.now() - offer.publishedAtTs < 3 * 86_400_000;
  const isExpired = offer.status === "EXPIRED";
  const remote =
    REMOTE_LABELS[offer.remotePolicy as keyof typeof REMOTE_LABELS] ?? offer.remotePolicy;

  const matchResult = candidateProfile && offer.universe === "TECH"
    ? computeMatchScore(candidateProfile, {
        educationLevel: offer.educationLevel as EducationLevel,
        specialty: offer.specialty as TechSpecialty,
        city: offer.city,
        remotePolicy: offer.remotePolicy as RemotePolicy,
      })
    : null;

  const isRow = layout === "row";

  const meta = (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink/65">
      <div className="flex min-w-0 items-center gap-1.5">
        <dt className="sr-only">Ville</dt>
        <MapPin aria-hidden="true" size={14} className="shrink-0 text-ink/35" />
        <dd className="flex min-w-0 items-center gap-1 truncate">
          {offer.countryCode !== "FR" && (
            <span aria-hidden="true">{COUNTRY_FLAGS[offer.countryCode] ?? "🌍"}</span>
          )}
          {offer.city}
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Télétravail</dt>
        <Laptop aria-hidden="true" size={14} className="shrink-0 text-ink/35" />
        <dd>{remote}</dd>
      </div>
      {salary && (
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Salaire</dt>
          <Wallet aria-hidden="true" size={14} className="shrink-0 text-ink/35" />
          <dd className="font-medium text-ink">{salary}</dd>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Publiée le</dt>
        <Clock aria-hidden="true" size={14} className="shrink-0 text-ink/35" />
        <dd>
          <time
            dateTime={new Date(offer.publishedAtTs).toISOString()}
            title={formatDateFr(offer.publishedAtTs)}
          >
            {offer.publicationKnown ? timeAgo(offer.publishedAtTs) : "Publication non précisée"}
          </time>
        </dd>
      </div>
    </dl>
  );

  const applyLink = !isExpired && (
    // z-10 pour passer au-dessus de l'overlay de la carte ; nouvel onglet vers la source.
    <a
      href={`/go/${offer.id}`}
      target="_blank"
      rel="nofollow noopener"
      className="relative z-10 inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg border border-line bg-paper px-3.5 text-[13px] font-semibold text-ink transition-[background-color,border-color,color,transform] duration-base ease-out hover:border-transparent hover:bg-volt hover:text-volt-ink active:scale-[0.97] group-hover:border-ink/20"
    >
      Postuler
      <ArrowUpRight
        aria-hidden="true"
        size={15}
        className="transition-transform duration-base ease-out group-hover:-translate-y-px group-hover:translate-x-px"
      />
      <span className="sr-only">
        {offer.title} sur {offer.sourceSite}, nouvel onglet
      </span>
    </a>
  );

  const matchBadge = matchResult && (
    <span
      className={`font-mono text-2xs font-semibold tabular-nums ${scoreTier(matchResult.score).className}`}
      title="Estimation basée sur votre profil, pas une décision de l'employeur."
    >
      {matchResult.score}% match
    </span>
  );

  return (
    <article
      className={`group relative flex rounded-xl border border-line bg-paper shadow-card transition-[border-color,box-shadow,transform] duration-base ease-out hover:border-ink/20 hover:shadow-lift ${
        isRow
          ? "flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
          : "h-full flex-col p-5 hover:-translate-y-0.5"
      } ${isExpired ? "opacity-75" : ""}`}
    >
      {/* Liseré d'accent qui se dessine au survol. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-4 left-0 w-[3px] origin-center scale-y-0 rounded-r-full bg-accent transition-transform duration-slow ease-out group-hover:scale-y-100"
      />

      <div
        className={`flex min-w-0 flex-1 gap-4 ${isRow ? "items-start sm:items-center" : "flex-col"}`}
      >
        <div className={`flex items-start gap-3 ${isRow ? "" : "justify-between"}`}>
          <CompanyLogo
            name={offer.companyName}
            logoUrl={offer.companyLogo}
            slug={offer.companySlug}
            size={isRow ? 48 : 40}
          />
          {!isRow && <ContractBadge type={offer.contractType} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink/60">
            <span className="truncate">{offer.companyName}</span>
            {isNew && !isExpired && <span className="badge-new shrink-0">Nouveau</span>}
            {isExpired && (
              <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-2xs font-semibold text-ink/60">
                Expirée
              </span>
            )}
          </p>
          <h3
            className={`mt-1 font-semibold leading-snug tracking-[-0.015em] text-ink ${
              isRow ? "text-[17px]" : "line-clamp-3 text-base"
            }`}
          >
            <Link
              href={`/offres/${offer.slug}`}
              className="break-words transition-colors duration-base after:absolute after:inset-0 after:rounded-xl group-hover:text-accent"
            >
              {offer.title}
            </Link>
          </h3>
          <div className={isRow ? "mt-2" : "mt-3"}>{meta}</div>
        </div>
      </div>

      {isRow ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
          <div className="flex items-center gap-2">
            {matchBadge}
            <ContractBadge type={offer.contractType} />
          </div>
          <div className="relative z-10 flex items-center gap-2">
            {actions}
            {applyLink}
          </div>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="min-w-0 truncate font-mono text-2xs text-ink/60">
            {matchBadge ?? offer.sourceSite}
          </span>
          <div className="relative z-10 flex items-center gap-2">
            {actions}
            {applyLink}
          </div>
        </div>
      )}
    </article>
  );
}

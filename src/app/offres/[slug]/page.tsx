import { sourceLabel } from "@/lib/source-label";
import { STUDENT_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Laptop,
  MapPin,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Markdown } from "@/components/markdown";
import { OfferCard, formatDateFr, formatSalary, timeAgo } from "@/components/offers/offer-card";
import { CompanyLogo } from "@/components/offers/company-logo";
import { SaveOfferButton } from "@/components/offers/save-offer-button";
import { AlreadyAppliedButton } from "@/components/applications/already-applied-button";
import { HideOfferButton } from "@/components/offers/hide-offer-button";
import { MatchScoreCard } from "@/components/offers/match-score-card";
import { CvMatchCard } from "@/components/offers/cv-match-card";
import { AiDraftPanel } from "@/components/offers/ai-draft-panel";
import { ContractBadge } from "@/components/ui/contract-badge";
import { isPlaceholderDescription } from "@/components/companies/company-text";
import { SpecialtyIcon } from "@/components/ui/specialty-icon";
import { findSimilarOffers } from "@/server/offers/similar";
import { offerToDocument } from "@/server/search/sync";
import { computeMatchScore } from "@/server/match/score";
import { computeCvMatch } from "@/server/cv/analyze";
import {
  CONTRACT_LABELS,
  COUNTRY_FLAGS,
  EDUCATION_LABELS,
  REMOTE_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/search-params";

export const dynamic = "force-dynamic";

async function getOffer(slug: string) {
  return prisma.jobOffer.findFirst({
    where: { slug, ...STUDENT_OFFER_WHERE },
    include: { company: true, origins: true },
  });
}

export async function generateMetadata({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await pendingParams;
  const offer = await getOffer(params.slug);
  if (!offer) return { title: "Offre introuvable" };
  return {
    title: `${offer.title} — ${offer.company.name}, ${offer.city}`,
    description: `${CONTRACT_LABELS[offer.contractType]} chez ${offer.company.name} à ${offer.city}. Postulez directement à la source (${sourceLabel(offer.sourceSite)}).`,
  };
}

/** JSON-LD JobPosting pour Google for Jobs. */
function jobPostingJsonLd(offer: NonNullable<Awaited<ReturnType<typeof getOffer>>>) {
  const employmentType: Record<string, string> = {
    CDI: "FULL_TIME",
    CDD: "TEMPORARY",
    STAGE: "INTERN",
    ALTERNANCE: "INTERN",
    VIE: "TEMPORARY",
    FULL_TIME: "FULL_TIME",
    PART_TIME: "PART_TIME",
    CONTRACT: "CONTRACTOR",
    FREELANCE: "CONTRACTOR",
  };
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: offer.title,
    description: offer.description,
    ...(offer.publicationKnown ? { datePosted: offer.publishedAt.toISOString() } : {}),
    employmentType: employmentType[offer.contractType],
    hiringOrganization: {
      "@type": "Organization",
      name: offer.company.name,
      sameAs: offer.company.website ?? undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: offer.city,
        addressCountry: offer.countryCode,
      },
    },
    ...(offer.salaryMin || offer.salaryMax
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "EUR",
            value: {
              "@type": "QuantitativeValue",
              minValue: offer.salaryMin ?? undefined,
              maxValue: offer.salaryMax ?? undefined,
              unitText: offer.salaryPeriod !== "UNKNOWN" ? offer.salaryPeriod : undefined,
            },
          },
        }
      : {}),
    ...(offer.status === "EXPIRED" ? { validThrough: offer.lastSeenAt.toISOString() } : {}),
  };
}

export default async function OffrePage({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await pendingParams;
  const offer = await getOffer(params.slug);
  if (!offer) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [similar, saved, tracked, hidden, candidateProfile] = await Promise.all([
    findSimilarOffers(offer),
    userId
      ? prisma.savedOffer
          .findUnique({ where: { userId_offerId: { userId, offerId: offer.id } } })
          .then(Boolean)
      : Promise.resolve(false),
    userId
      ? prisma.application
          .findUnique({ where: { userId_offerId: { userId, offerId: offer.id } } })
          .then(Boolean)
      : Promise.resolve(false),
    userId
      ? prisma.hiddenOffer
          .findUnique({ where: { userId_offerId: { userId, offerId: offer.id } } })
          .then(Boolean)
      : Promise.resolve(false),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { educationLevel: true, targetSpecialty: true, city: true, cvText: true },
        })
      : Promise.resolve(null),
  ]);

  const matchResult = candidateProfile
    ? computeMatchScore(candidateProfile, {
        educationLevel: offer.educationLevel,
        specialty: offer.specialty,
        city: offer.city,
        remotePolicy: offer.remotePolicy,
      })
    : null;

  const cvMatchResult = candidateProfile?.cvText
    ? computeCvMatch(candidateProfile.cvText, `${offer.title}\n${offer.description}`)
    : null;

  const isExpired = offer.status === "EXPIRED";
  const salary = formatSalary(offer.salaryMin, offer.salaryMax, offer.salaryPeriod);
  const isLoggedIn = Boolean(session?.user);
  const specialtyLabel = offer.universe === "TECH" ? SPECIALTY_LABELS[offer.specialty as keyof typeof SPECIALTY_LABELS] : null;

  const facts = [
    {
      icon: MapPin,
      label: "Lieu",
      value: (
        <>
          {offer.countryCode !== "FR" && (
            <span aria-hidden="true">{COUNTRY_FLAGS[offer.countryCode] ?? "🌍"} </span>
          )}
          {offer.city}
        </>
      ),
    },
    { icon: Laptop, label: "Télétravail", value: REMOTE_LABELS[offer.remotePolicy] },
    { icon: GraduationCap, label: "Niveau", value: offer.universe !== "TECH" && offer.educationLevel === "INDIFFERENT" ? "Non précisé" : EDUCATION_LABELS[offer.educationLevel] },
    {
      icon: Wallet,
      label: "Rémunération",
      value: salary ?? <span className="text-ink/60">Non précisée</span>,
    },
  ];

  return (
    <div className="container-page pb-28 pt-6 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(offer)) }}
      />

      {offer.status === "UNCERTAIN" && <p role="status" className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning">Disponibilité à confirmer : cette annonce n’a pas pu être revérifiée récemment. Consultez la source avant de candidater.</p>}
      <nav aria-label="Fil d'Ariane" className="text-[13px] text-ink/60">
        <ol className="flex min-w-0 items-center gap-1.5">
          <li>
            <Link href="/offres" className="transition-colors hover:text-ink">
              Offres
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={13} />
          </li>
          <li className="min-w-0 truncate">
            <Link
              href={`/entreprises/${offer.company.slug}`}
              className="transition-colors hover:text-ink"
            >
              {offer.company.name}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:block">
            <ChevronRight size={13} />
          </li>
          <li className="hidden min-w-0 truncate text-ink/70 sm:block" aria-current="page">
            {offer.title}
          </li>
        </ol>
      </nav>

      {isExpired && (
        <div className="alert-info mt-5 flex items-start gap-3" role="alert">
          <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">Cette offre a expiré</p>
            <p className="mt-0.5 text-ink/70">
              Elle n&apos;a plus été vue sur {sourceLabel(offer.sourceSite)} depuis le{" "}
              {offer.lastSeenAt.toLocaleDateString("fr-FR")}. Jetez un œil aux offres similaires
              ci-dessous.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <article className="min-w-0">
          <header className="rounded-2xl border border-line bg-paper p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <CompanyLogo
                name={offer.company.name}
                logoUrl={offer.company.logoUrl}
                slug={offer.company.slug}
                website={offer.company.website}
                size={56}
              />
              <div className="min-w-0">
                <Link
                  href={`/entreprises/${offer.company.slug}`}
                  className="block truncate font-medium text-ink/80 transition-colors hover:text-accent"
                >
                  {offer.company.name}
                </Link>
                <p className="flex items-center gap-1.5 text-[13px] text-ink/60">
                  {specialtyLabel && (
                    <>
                      {offer.universe === "TECH" && <SpecialtyIcon specialty={offer.specialty} size={13} />}
                      {specialtyLabel} ·{" "}
                    </>
                  )}
                  {offer.sector}
                </p>
              </div>
            </div>

            <h1 className="mt-6 text-[clamp(1.75rem,1.2rem+2.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              {offer.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ContractBadge type={offer.contractType} className="!px-3 !py-1.5 !text-[13px]" />
              <span className="flex items-center gap-1.5 text-[13px] text-ink/60">
                <CalendarDays aria-hidden="true" size={14} />
                {offer.publicationKnown ? "Publiée " : "Publication non précisée · détectée "}
                <time dateTime={(offer.publicationKnown ? offer.publishedAt : offer.createdAt).toISOString()}>
                  {timeAgo((offer.publicationKnown ? offer.publishedAt : offer.createdAt).getTime())}
                </time>
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-paper sm:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }, i) => (
                <div
                  key={label}
                  className={`p-4 ${i % 2 === 1 ? "border-l border-line" : ""} ${
                    i >= 2 ? "border-t border-line sm:border-t-0" : ""
                  } ${i >= 1 ? "sm:border-l" : ""}`}
                >
                  <dt className="eyebrow flex items-center gap-1.5">
                    <Icon aria-hidden="true" size={13} />
                    {label}
                  </dt>
                  <dd className="mt-2 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold">Description du poste</h2>
            <div className="mt-2 max-w-[70ch] text-[15.5px] leading-[1.75] text-ink/85">
              {offer.universe !== "TECH" && <div className="mb-6 border-y border-line py-4 text-sm text-ink/75"><p>Première détection : {formatDateFr(offer.createdAt.getTime())} · Dernière observation : {formatDateFr(offer.lastSeenAt.getTime())}</p>{offer.qualificationText && <p className="mt-2">Qualification mentionnée : {offer.qualificationText}</p>}<p className="mt-2">Sources : {(offer.origins.length ? offer.origins : [{ sourceSite: offer.sourceSite, sourceUrl: offer.sourceUrl }]).map((origin, index) => <span key={origin.sourceUrl}>{index > 0 && " · "}<a className="link break-all" href={origin.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel(origin.sourceSite)}</a></span>)}</p></div>}
            <Markdown content={offer.description} />
            </div>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <div className="panel">
            {!isExpired ? (
              <>
                <a
                  href={`/go/${offer.id}`}
                  target="_blank"
                  rel="nofollow noopener"
                  className="btn-cobalt group !min-h-[52px] w-full !whitespace-normal text-center text-base"
                >
                  Postuler sur {offer.sourceSite.replace(/^www\./, "")}
                  <ArrowUpRight
                    aria-hidden="true"
                    size={18}
                    className="transition-transform duration-base ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
                <p className="mt-2.5 text-center text-xs text-ink/60">
                  Vous serez redirigé·e vers l&apos;annonce d&apos;origine
                </p>
              </>
            ) : (
              <Link href={`/offres/${offer.slug}/expiree`} className="btn-cobalt w-full">
                Voir les offres similaires
              </Link>
            )}

            <div className="mt-4">
              <SaveOfferButton offerId={offer.id} initialSaved={saved} isLoggedIn={isLoggedIn} />
              <div className="mt-1 flex flex-col items-center">
                <AlreadyAppliedButton
                  offerId={offer.id}
                  initialTracked={tracked}
                  isLoggedIn={isLoggedIn}
                />
                <HideOfferButton
                  offerId={offer.id}
                  initialHidden={hidden}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Publiée le</dt>
                <dd className="text-right">
                  <time dateTime={offer.publishedAt.toISOString()}>
                    {offer.publicationKnown ? formatDateFr(offer.publishedAt.getTime()) : "Non précisée"}
                  </time>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Contrat</dt>
                <dd className="text-right">{CONTRACT_LABELS[offer.contractType]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Source</dt>
                <dd className="truncate text-right font-mono text-xs">{sourceLabel(offer.sourceSite)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Collectée le</dt>
                <dd className="text-right">{offer.scrapedAt.toLocaleDateString("fr-FR")}</dd>
              </div>
            </dl>
          </div>

          {offer.universe === "TECH" && <MatchScoreCard isLoggedIn={isLoggedIn} result={matchResult} />}
          <CvMatchCard
            isLoggedIn={isLoggedIn}
            hasCv={Boolean(candidateProfile?.cvText)}
            result={cvMatchResult}
          />
          <AiDraftPanel offerId={offer.id} isLoggedIn={isLoggedIn} />

          <div className="panel">
            <div className="flex items-center gap-3">
              <CompanyLogo
                name={offer.company.name}
                logoUrl={offer.company.logoUrl}
                slug={offer.company.slug}
                website={offer.company.website}
                size={40}
              />
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{offer.company.name}</h2>
                <p className="flex items-center gap-1 text-xs text-ink/60">
                  <Building2 aria-hidden="true" size={12} />
                  {offer.company.sector}
                </p>
              </div>
            </div>
            {!isPlaceholderDescription(offer.company.description) && (
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink/65">
                {offer.company.description}
              </p>
            )}
            <Link
              href={`/entreprises/${offer.company.slug}`}
              className="link mt-3 inline-block text-sm"
            >
              Voir l&apos;entreprise et ses offres →
            </Link>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-20 border-t border-line pt-12" aria-labelledby="similaires">
          <p className="eyebrow">À voir aussi</p>
          <h2 id="similaires" className="mt-3 text-display-sm font-semibold">
            Offres <span className="serif-accent">similaires</span>
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((o) => (
              <OfferCard
                key={o.id}
                offer={offerToDocument(o)}
                candidateProfile={candidateProfile}
              />
            ))}
          </div>
        </section>
      )}

      {/* Barre d'action mobile : « Postuler » toujours à portée de pouce. */}
      {!isExpired && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{offer.title}</p>
              <p className="truncate text-xs text-ink/60">{offer.company.name}</p>
            </div>
            <a
              href={`/go/${offer.id}`}
              target="_blank"
              rel="nofollow noopener"
              className="btn-volt shrink-0"
            >
              Postuler
              <ArrowUpRight aria-hidden="true" size={16} />
              <span className="sr-only">(sur {sourceLabel(offer.sourceSite)}, nouvel onglet)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
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
import { findSimilarOffers } from "@/server/offers/similar";
import { offerToDocument } from "@/server/search/sync";
import { computeMatchScore } from "@/server/match/score";
import { CONTRACT_LABELS, EDUCATION_LABELS, REMOTE_LABELS } from "@/lib/search-params";

export const dynamic = "force-dynamic";

async function getOffer(slug: string) {
  return prisma.jobOffer.findUnique({
    where: { slug },
    include: { company: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const offer = await getOffer(params.slug);
  if (!offer) return { title: "Offre introuvable" };
  return {
    title: `${offer.title} — ${offer.company.name}, ${offer.city}`,
    description: `${CONTRACT_LABELS[offer.contractType]} chez ${offer.company.name} à ${offer.city}. Postulez directement à la source (${offer.sourceSite}).`,
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
    datePosted: offer.publishedAt.toISOString(),
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
              unitText: (offer.salaryMin ?? offer.salaryMax ?? 0) >= 10000 ? "YEAR" : "MONTH",
            },
          },
        }
      : {}),
    ...(offer.status === "EXPIRED" ? { validThrough: offer.lastSeenAt.toISOString() } : {}),
  };
}

export default async function OffrePage({ params }: { params: { slug: string } }) {
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
          select: { educationLevel: true, targetSpecialty: true, city: true },
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

  const isExpired = offer.status === "EXPIRED";
  const salary = formatSalary(offer.salaryMin, offer.salaryMax);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(offer)) }}
      />

      <nav aria-label="Fil d'Ariane" className="text-sm text-ink/60">
        <Link href="/offres" className="underline-offset-4 hover:underline">
          Offres
        </Link>{" "}
        / <span aria-current="page">{offer.title}</span>
      </nav>

      {isExpired && (
        <div className="mt-4 rounded-lg border border-cobalt/20 bg-cobalt-soft p-4" role="alert">
          <p className="font-display text-lg font-bold">Cette offre a expiré</p>
          <p className="text-sm">
            Elle n'a plus été vue sur {offer.sourceSite} depuis le{" "}
            {offer.lastSeenAt.toLocaleDateString("fr-FR")}. Jetez un œil aux offres similaires
            ci-dessous.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <article>
          <div className="flex items-start gap-4">
            <CompanyLogo name={offer.company.name} logoUrl={offer.company.logoUrl} size={56} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink/60">
                <Link
                  href={`/entreprises/${offer.company.slug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {offer.company.name}
                </Link>
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">
                {offer.title}
              </h1>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="stamp">{CONTRACT_LABELS[offer.contractType]}</span>
            <span className="ticket">{offer.city}</span>
            <span className="ticket">{REMOTE_LABELS[offer.remotePolicy]}</span>
            <span className="ticket">{EDUCATION_LABELS[offer.educationLevel]}</span>
            {salary && <span className="ticket font-semibold">{salary}</span>}
          </div>

          <div className="mt-6 text-[15px]">
            <Markdown content={offer.description} />
          </div>
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            {!isExpired ? (
              <>
                <a
                  href={`/go/${offer.id}`}
                  target="_blank"
                  rel="nofollow noopener"
                  className="btn-cobalt w-full text-base"
                >
                  Postuler <span aria-hidden="true">↗</span>
                  <span className="sr-only">(sur {offer.sourceSite}, nouvel onglet)</span>
                </a>
                <p className="mt-2 text-center text-xs text-ink/55">
                  Vous serez redirigé·e vers {offer.sourceSite}
                </p>
              </>
            ) : (
              <Link href={`/offres/${offer.slug}/expiree`} className="btn-outline w-full">
                Voir les offres similaires
              </Link>
            )}

            <div className="mt-3">
              <SaveOfferButton
                offerId={offer.id}
                initialSaved={saved}
                isLoggedIn={Boolean(session?.user)}
              />
              <AlreadyAppliedButton
                offerId={offer.id}
                initialTracked={tracked}
                isLoggedIn={Boolean(session?.user)}
              />
              <HideOfferButton
                offerId={offer.id}
                initialHidden={hidden}
                isLoggedIn={Boolean(session?.user)}
              />
            </div>

            <dl className="rule mt-4 space-y-2 pt-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink/60">Publiée le</dt>
                <dd className="text-right">
                  <time dateTime={offer.publishedAt.toISOString()}>
                    {formatDateFr(offer.publishedAt.getTime())}
                  </time>{" "}
                  ({timeAgo(offer.publishedAt.getTime())})
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink/60">Secteur</dt>
                <dd className="text-right">{offer.sector}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink/60">Source</dt>
                <dd>{offer.sourceSite}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink/60">Scrapée le</dt>
                <dd>{offer.scrapedAt.toLocaleDateString("fr-FR")}</dd>
              </div>
            </dl>
          </div>

          <MatchScoreCard isLoggedIn={Boolean(session?.user)} result={matchResult} />

          <div className="card mt-4 p-5">
            <h2 className="font-display text-lg font-bold">{offer.company.name}</h2>
            <p className="mt-2 line-clamp-4 text-sm text-ink/75">{offer.company.description}</p>
            <Link
              href={`/entreprises/${offer.company.slug}`}
              className="mt-3 inline-block text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              Voir l'entreprise et ses offres →
            </Link>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14" aria-labelledby="similaires">
          <h2 id="similaires" className="rule pt-6 font-display text-2xl font-bold">
            Offres similaires
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((o) => (
              <OfferCard key={o.id} offer={offerToDocument(o)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

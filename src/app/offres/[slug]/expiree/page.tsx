import { STUDENT_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { findSimilarOffers } from "@/server/offers/similar";
import { offerToDocument } from "@/server/search/sync";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offre expirée",
  robots: { index: false },
};

/** Page « Offre expirée » avec 6 offres similaires (cible du /go/ sur offre expirée). */
export default async function OffreExpireePage({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await pendingParams;
  const offer = await prisma.jobOffer.findFirst({
    where: { slug: params.slug, ...STUDENT_OFFER_WHERE },
    include: { company: true },
  });
  if (!offer) notFound();

  const similar = await findSimilarOffers(offer, 6);

  return (
    <div className="container-page pb-8 pt-12">
      <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-paper p-8 text-center shadow-card sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
          <Clock aria-hidden="true" size={13} />
          Offre expirée
        </span>
        <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
          {offer.title}
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          {offer.company.name} — {offer.city}. Cette offre n&apos;est plus disponible sur{" "}
          {offer.sourceSite}.
        </p>
      </div>

      <section className="mt-16" aria-labelledby="similaires">
        <h2 id="similaires" className="text-center text-display-sm font-semibold">
          {similar.length > 0 ? (
            <>
              Ces offres pourraient <span className="serif-accent text-accent">vous plaire</span>
            </>
          ) : (
            "Explorez les offres actives"
          )}
        </h2>
        {similar.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((o) => (
              <OfferCard key={o.id} offer={offerToDocument(o)} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center">
            <Link href="/offres" className="btn-cobalt">
              Voir toutes les offres
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

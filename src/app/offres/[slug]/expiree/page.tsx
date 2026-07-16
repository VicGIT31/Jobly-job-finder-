import type { Metadata } from "next";
import Link from "next/link";
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
export default async function OffreExpireePage({ params }: { params: { slug: string } }) {
  const offer = await prisma.jobOffer.findUnique({
    where: { slug: params.slug },
    include: { company: true },
  });
  if (!offer) notFound();

  const similar = await findSimilarOffers(offer, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-xl border-2 border-ink bg-signal p-8 text-center text-[#141414]">
        <p className="stamp !border-[#141414] bg-transparent">Offre expirée</p>
        <h1 className="mt-4 font-display text-3xl font-black leading-tight">{offer.title}</h1>
        <p className="mt-2 text-sm">
          {offer.company.name} — {offer.city}. Cette offre n'est plus disponible sur{" "}
          {offer.sourceSite}.
        </p>
      </div>

      <section className="mt-12" aria-labelledby="similaires">
        <h2 id="similaires" className="rule pt-6 text-center font-display text-2xl font-bold">
          {similar.length > 0
            ? "Ces offres pourraient vous plaire"
            : "Explorez les offres actives"}
        </h2>
        {similar.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((o) => (
              <OfferCard key={o.id} offer={offerToDocument(o)} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-center">
            <Link href="/offres" className="btn-cobalt">
              Voir toutes les offres
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

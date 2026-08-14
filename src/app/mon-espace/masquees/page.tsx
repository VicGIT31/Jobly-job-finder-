import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { unhideOffer } from "@/server/account/actions";

export const metadata: Metadata = { title: "Offres masquées" };

export default async function MasqueesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const hidden = await prisma.hiddenOffer.findMany({
    where: { userId: session.user.id },
    include: { offer: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section aria-labelledby="masquees-titre">
      <h2 id="masquees-titre" className="font-display text-xl font-bold">
        {hidden.length} offre{hidden.length > 1 ? "s" : ""} masquée{hidden.length > 1 ? "s" : ""}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Ces offres n'apparaissent plus dans vos résultats de recherche.
      </p>

      {hidden.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink/70">Aucune offre masquée pour l'instant.</p>
          <Link href="/offres" className="btn-cobalt mt-4">
            Explorer les offres
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {hidden.map(({ offer, id }) => (
            <div key={id} className="relative">
              <OfferCard offer={offerToDocument(offer)} />
              <form
                action={unhideOffer.bind(null, offer.id)}
                className="absolute bottom-3 right-3 z-10"
              >
                <button
                  type="submit"
                  className="text-xs text-ink/50 underline-offset-4 hover:text-ink hover:underline"
                >
                  Réafficher
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

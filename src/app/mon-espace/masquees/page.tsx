import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { unhideOffer } from "@/server/account/actions";
import { EyeOff } from "lucide-react";
import { AccountEmptyState, SectionHeader } from "@/components/account/section-header";

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
      <SectionHeader
        id="masquees-titre"
        title={
          <>
            {hidden.length} offre{hidden.length > 1 ? "s" : ""} masquée
            {hidden.length > 1 ? "s" : ""}
          </>
        }
        description="Ces offres n'apparaissent plus dans vos résultats de recherche."
      />

      {hidden.length === 0 ? (
        <AccountEmptyState
          icon={<EyeOff aria-hidden="true" size={22} />}
          title="Aucune offre masquée pour l'instant"
          action={
            <Link href="/offres" className="btn-cobalt">
              Explorer les offres
            </Link>
          }
        >
          Masquez une offre depuis sa page pour ne plus la voir dans vos recherches.
        </AccountEmptyState>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {hidden.map(({ offer, id }) => (
            <OfferCard
              key={id}
              offer={offerToDocument(offer)}
              actions={
                <form action={unhideOffer.bind(null, offer.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-[40px] items-center rounded-lg px-2.5 text-[13px] font-medium text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    Réafficher
                    <span className="sr-only"> {offer.title}</span>
                  </button>
                </form>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

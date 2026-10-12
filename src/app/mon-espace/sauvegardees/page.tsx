import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { removeSavedOffer } from "@/server/account/actions";
import { Bookmark } from "lucide-react";
import { AccountEmptyState, SectionHeader } from "@/components/account/section-header";

export const metadata: Metadata = { title: "Offres sauvegardées" };

export default async function SauvegardeesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const saved = await prisma.savedOffer.findMany({
    where: { userId: session.user.id },
    include: { offer: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section aria-labelledby="sauvegardees-titre">
      <SectionHeader
        id="sauvegardees-titre"
        title={
          <>
            {saved.length} offre{saved.length > 1 ? "s" : ""} sauvegardée
            {saved.length > 1 ? "s" : ""}
          </>
        }
        description="Vos offres mises de côté, à retrouver avant de postuler."
      />

      {saved.length === 0 ? (
        <AccountEmptyState
          icon={<Bookmark aria-hidden="true" size={22} />}
          title="Aucune offre sauvegardée"
          action={
            <Link href="/offres" className="btn-cobalt">
              Explorer les offres
            </Link>
          }
        >
          Sauvegardez des offres depuis leur page pour les retrouver ici.
        </AccountEmptyState>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {saved.map(({ offer, id }) => (
            <OfferCard
              key={id}
              offer={offerToDocument(offer)}
              actions={
                <form action={removeSavedOffer.bind(null, offer.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-[40px] items-center rounded-lg px-2.5 text-[13px] font-medium text-ink/60 transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    Retirer
                    <span className="sr-only"> {offer.title} des offres sauvegardées</span>
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

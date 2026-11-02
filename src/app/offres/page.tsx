import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchOffers } from "@/server/search/query";
import { parseOfferSearchParams } from "@/lib/search-params";
import { SearchClient } from "@/components/offers/search-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres : tech, commerce, marketing, communication & ASV",
  description:
    "Recherchez parmi les offres de stage, d'alternance et d'emploi : tech, commerce, marketing, communication, auxiliaires vétérinaires et métiers animaliers. Filtres par domaine, métier, ville, rayon, contrat et expérience.",
};

/**
 * Page /offres — la première page est rendue côté serveur (partage d'URL),
 * puis la recherche devient instantanée côté client (TanStack Query + nuqs).
 * Un seul profil local : aucune connexion n'est nécessaire.
 */
export default async function OffresPage({
  searchParams: pendingSearchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await pendingSearchParams;
  const input = parseOfferSearchParams(searchParams);
  const [initialResult, session] = await Promise.all([searchOffers(input), auth()]);

  const candidateProfile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { educationLevel: true, targetSpecialty: true, city: true },
  });

  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <p className="eyebrow">Catalogue · tech, commerce, communication &amp; ASV</p>
          <h1 className="mt-3 text-display-sm font-semibold">
            Trouvez votre <span className="serif-accent text-accent">prochain poste</span>.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink/60">
          Recherchez un métier, une entreprise ou une ville, puis postulez directement sur
          l&apos;annonce d&apos;origine. La couverture n&apos;est jamais exhaustive.
        </p>
      </header>
      <div className="mt-6">
        <SearchClient
          initialResult={initialResult}
          isLoggedIn
          candidateProfile={candidateProfile}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchOffers } from "@/server/search/query";
import { parseOfferSearchParams } from "@/lib/search-params";
import { SearchClient } from "@/components/offers/search-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres d’emploi en France",
  description:
    "Explorez les offres d’emploi, de stage et d’alternance en France, par domaine, métier, ville et contrat.",
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
      <header className="mb-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">Offres d’emploi en France</h1>
        <p className="mt-2 text-ink/70">Recherchez parmi les annonces collectées par Jobly.</p>
      </header>
      <div>
        <SearchClient
          initialResult={initialResult}
          isLoggedIn
          candidateProfile={candidateProfile}
        />
      </div>
    </div>
  );
}

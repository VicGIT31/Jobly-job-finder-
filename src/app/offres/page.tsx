import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { searchOffers } from "@/server/search/query";
import { parseOfferSearchParams } from "@/lib/search-params";
import { SearchClient } from "@/components/offers/search-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres de stage, alternance, CDI et VIE",
  description:
    "Recherchez parmi des centaines d'offres pour étudiants et jeunes diplômés : stages, alternances, CDI, VIE. Filtres par ville, contrat, secteur, télétravail.",
};

/**
 * Page /offres — la première page est rendue côté serveur (SEO + partage d'URL),
 * puis la recherche devient instantanée côté client (TanStack Query + nuqs).
 */
export default async function OffresPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const input = parseOfferSearchParams(searchParams);
  const [initialResult, session] = await Promise.all([searchOffers(input), auth()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-black tracking-tight">
        Les offres<span className="text-cobalt">.</span>
      </h1>
      <p className="mt-1 text-ink/70">
        Chaque offre vient d'un site source — postuler vous y amène directement.
      </p>
      <div className="mt-6">
        <SearchClient initialResult={initialResult} isLoggedIn={Boolean(session?.user)} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchOffers } from "@/server/search/query";
import { excludeHiddenOffers } from "@/server/offers/hidden-filter";
import { parseOfferSearchParams } from "@/lib/search-params";
import { SearchClient } from "@/components/offers/search-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres de stage et d'alternance",
  description:
    "Recherchez parmi des centaines d'offres de stage et d'alternance pour étudiants et jeunes diplômés. Filtres par ville, contrat, secteur, télétravail.",
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

  if (session?.user?.id) {
    const hidden = await prisma.hiddenOffer.findMany({
      where: { userId: session.user.id },
      select: { offerId: true },
    });
    if (hidden.length > 0) {
      const hiddenIds = new Set(hidden.map((h) => h.offerId));
      initialResult.hits = excludeHiddenOffers(initialResult.hits, hiddenIds);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">
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

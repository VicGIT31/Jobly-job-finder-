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
    "Recherchez parmi des centaines d'offres de stage et d'alternance en France, avec des offres tech complémentaires en Europe. Filtres par ville, pays, contrat, secteur, télétravail.",
};

/**
 * Page /offres — la première page est rendue côté serveur (SEO + partage d'URL),
 * puis la recherche devient instantanée côté client (TanStack Query + nuqs).
 */
export default async function OffresPage({
  searchParams: pendingSearchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await pendingSearchParams;
  const input = parseOfferSearchParams(searchParams);
  const [initialResult, session] = await Promise.all([searchOffers(input), auth()]);

  const userId = session?.user?.id ?? null;
  const candidateProfile = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { educationLevel: true, targetSpecialty: true, city: true },
      })
    : null;

  if (userId) {
    const hidden = await prisma.hiddenOffer.findMany({
      where: { userId },
      select: { offerId: true },
    });
    if (hidden.length > 0) {
      const hiddenIds = new Set(hidden.map((h) => h.offerId));
      initialResult.hits = excludeHiddenOffers(initialResult.hits, hiddenIds);
    }
  }

  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <p className="eyebrow">Catalogue · stages &amp; alternances tech</p>
          <h1 className="mt-3 text-display-sm font-semibold">
            Trouvez votre <span className="serif-accent text-accent">prochaine mission</span>.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink/60">
          Recherchez un métier, une entreprise ou une ville, puis postulez directement sur
          l&apos;annonce d&apos;origine.
        </p>
      </header>
      <div className="mt-6">
        <SearchClient
          initialResult={initialResult}
          isLoggedIn={Boolean(session?.user)}
          candidateProfile={candidateProfile}
        />
      </div>
    </div>
  );
}

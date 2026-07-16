import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { HomeSearch } from "@/components/home-search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recentOffers, featuredCompanies, offerCount, companyCount, cityCount] = await Promise.all([
    prisma.jobOffer.findMany({
      where: { status: "ACTIVE" },
      include: { company: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    prisma.company.findMany({ where: { featured: true }, take: 5 }),
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.company.count(),
    prisma.jobOffer.groupBy({ by: ["city"], where: { status: "ACTIVE" } }).then((g) => g.length),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="stamp">Étudiants & jeunes diplômés</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Votre prochain <span className="highlight-marker">stage</span>, alternance ou premier
            CDI<span className="text-cobalt">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink/70">
            NextStep agrège les meilleures offres du web et vous redirige toujours vers la source.
            Pas de formulaire maison, pas de perte de temps.
          </p>
          <div className="mt-8 max-w-2xl">
            <HomeSearch />
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dd className="font-display text-3xl font-black">{offerCount}</dd>
              <dt className="text-sm text-ink/60">offres actives</dt>
            </div>
            <div>
              <dd className="font-display text-3xl font-black">{companyCount}</dd>
              <dt className="text-sm text-ink/60">entreprises</dt>
            </div>
            <div>
              <dd className="font-display text-3xl font-black">{cityCount}</dd>
              <dt className="text-sm text-ink/60">villes</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* Offres récentes */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="recentes">
        <div className="flex items-baseline justify-between">
          <h2 id="recentes" className="font-display text-2xl font-bold">
            Fraîchement publiées
          </h2>
          <Link
            href="/offres"
            className="text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
          >
            Toutes les offres →
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentOffers.map((offer, i) => (
            <OfferCard key={offer.id} offer={offerToDocument(offer)} index={i} />
          ))}
        </div>
      </section>

      {/* Entreprises mises en avant */}
      <section className="mx-auto max-w-6xl px-4 pb-12" aria-labelledby="entreprises">
        <h2 id="entreprises" className="rule pt-8 font-display text-2xl font-bold">
          Elles recrutent en ce moment
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {featuredCompanies.map((company) => (
            <Link
              key={company.id}
              href={`/entreprises/${company.slug}`}
              className="group border border-ink/30 p-4 transition-all duration-150 hover:border-ink hover:shadow-hard"
            >
              <p className="font-display text-lg font-bold group-hover:text-cobalt">
                {company.name}
              </p>
              <p className="mt-1 text-xs text-ink/60">{company.sector}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

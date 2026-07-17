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
      <section className="border-b border-ink/10 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <p className="stamp">Étudiants &amp; jeunes diplômés</p>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Trouvez votre <span className="text-cobalt">stage</span> ou votre{" "}
            <span className="text-cobalt">alternance</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
            NextStep agrège les meilleures offres du web et vous redirige toujours vers la source.
            Pas de formulaire maison, pas de perte de temps.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <HomeSearch />
          </div>
          <dl className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-4">
            <div>
              <dd className="text-3xl font-bold">{offerCount}</dd>
              <dt className="text-sm text-ink/50">offres actives</dt>
            </div>
            <div>
              <dd className="text-3xl font-bold">{companyCount}</dd>
              <dt className="text-sm text-ink/50">entreprises</dt>
            </div>
            <div>
              <dd className="text-3xl font-bold">{cityCount}</dd>
              <dt className="text-sm text-ink/50">villes</dt>
            </div>
          </dl>
        </div>
      </section>

      {/* Offres récentes */}
      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="recentes">
        <div className="flex items-baseline justify-between">
          <h2 id="recentes" className="text-2xl font-bold tracking-tight">
            Fraîchement publiées
          </h2>
          <Link
            href="/offres"
            className="text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
          >
            Toutes les offres →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offerToDocument(offer)} />
          ))}
        </div>
      </section>

      {/* Entreprises mises en avant */}
      <section className="mx-auto max-w-6xl px-4 pb-16" aria-labelledby="entreprises">
        <h2 id="entreprises" className="text-2xl font-bold tracking-tight">
          Elles recrutent en ce moment
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {featuredCompanies.map((company) => (
            <Link
              key={company.id}
              href={`/entreprises/${company.slug}`}
              className="card group p-5 hover:shadow-lift"
            >
              <p className="font-semibold group-hover:text-cobalt">{company.name}</p>
              <p className="mt-1 text-xs text-ink/50">{company.sector}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

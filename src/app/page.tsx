import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { HomeSearch } from "@/components/home-search";
import { resolveCollections } from "@/lib/company-collections";
import { SPECIALTIES, SPECIALTY_ICONS, SPECIALTY_LABELS } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    recentOffers,
    collections,
    specialtyCounts,
    offerCount,
    companyCount,
    cityCount,
    internationalCount,
  ] = await Promise.all([
    prisma.jobOffer.findMany({
      where: { status: "ACTIVE" },
      include: { company: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    resolveCollections(),
    prisma.jobOffer.groupBy({
      by: ["specialty"],
      where: { status: "ACTIVE" },
      _count: true,
    }),
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.company.count(),
    prisma.jobOffer.groupBy({ by: ["city"], where: { status: "ACTIVE" } }).then((g) => g.length),
    // Offres internationales (hors stage/alternance France) — voir
    // SOURCES_EUROPE_ASIA.md. Affichées en secondaire, sans changer la
    // promesse principale du site (stage/alternance France).
    prisma.jobOffer.count({ where: { status: "ACTIVE", countryCode: { not: "FR" } } }),
  ]);

  const countBySpecialty = new Map(specialtyCounts.map((row) => [row.specialty, row._count]));

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
            Jobly agrège les meilleures offres du web et vous redirige toujours vers la source. Pas
            de formulaire maison, pas de perte de temps.
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

          {internationalCount > 0 && (
            <p className="mt-6 text-sm text-ink/60">
              Aussi disponible :{" "}
              <Link
                href="/offres?contrat=FULL_TIME,PART_TIME,CONTRACT,FREELANCE"
                className="font-semibold text-cobalt underline-offset-4 hover:underline"
              >
                {internationalCount} offre{internationalCount > 1 ? "s" : ""} à l'international
              </Link>{" "}
              (CDI, contrats — hors stage/alternance France)
            </p>
          )}
        </div>
      </section>

      {/* Spécialités : l'entrée la plus directe vers les offres pour un dev */}
      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="specialites">
        <h2 id="specialites" className="text-2xl font-bold tracking-tight">
          Explorez par spécialité
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((specialty) => {
            const count = countBySpecialty.get(specialty) ?? 0;
            return (
              <Link
                key={specialty}
                href={`/offres?specialite=${specialty}`}
                className="card group flex items-center gap-4 p-5 hover:shadow-lift"
              >
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-2xl transition-transform group-hover:scale-110"
                >
                  {SPECIALTY_ICONS[specialty]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:text-cobalt">
                    {SPECIALTY_LABELS[specialty]}
                  </span>
                  <span className="text-sm text-ink/55">
                    {count} offre{count > 1 ? "s" : ""}
                  </span>
                </span>
              </Link>
            );
          })}
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

      {/* Vitrines d'entreprises : GAFAM, tech françaises, licornes */}
      {collections.map((collection) => (
        <section
          key={collection.key}
          className="mx-auto max-w-6xl px-4 pb-14"
          aria-labelledby={`collection-${collection.key}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2
                id={`collection-${collection.key}`}
                className="flex items-center gap-2 text-2xl font-bold tracking-tight"
              >
                <span aria-hidden="true">{collection.icon}</span>
                {collection.label}
              </h2>
              <p className="mt-1 text-sm text-ink/60">{collection.tagline}</p>
            </div>
            <p className="text-sm font-semibold text-cobalt">
              {collection.totalOffers} offre{collection.totalOffers > 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {collection.companies.slice(0, 8).map((company) => (
              <Link
                key={company.slug}
                href={`/entreprises/${company.slug}`}
                className="card group flex items-center justify-between gap-3 p-4 hover:shadow-lift"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:text-cobalt">
                    {company.name}
                  </span>
                  <span className="text-xs text-ink/50">
                    {company.offerCount} offre{company.offerCount > 1 ? "s" : ""}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-ink/30 transition-transform group-hover:translate-x-0.5 group-hover:text-cobalt"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

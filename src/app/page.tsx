import Link from "next/link";
import { Briefcase, Building2, MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { HomeSearch } from "@/components/home-search";
import { resolveCollections } from "@/server/companies/collections";
import {
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  EUROPEAN_COUNTRIES,
  SPECIALTIES,
  SPECIALTY_ICONS,
  SPECIALTY_LABELS,
} from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    recentOffers,
    collections,
    specialtyCounts,
    offerCount,
    companyCount,
    cityCount,
    countryCounts,
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
    // Répartition par pays — voir SOURCES_EUROPE_ASIA.md. Sert la section
    // "Explorez l'Europe" ci-dessous (focus Europe + France).
    prisma.jobOffer.groupBy({ by: ["countryCode"], where: { status: "ACTIVE" }, _count: true }),
  ]);

  const countBySpecialty = new Map(specialtyCounts.map((row) => [row.specialty, row._count]));
  const countByCountry = new Map(countryCounts.map((row) => [row.countryCode, row._count]));
  const franceCount = countByCountry.get("FR") ?? 0;
  const internationalCount = offerCount - franceCount;
  const europeCards = EUROPEAN_COUNTRIES.map((code) => ({
    code,
    label: COUNTRY_LABELS[code],
    count: countByCountry.get(code) ?? 0,
  }))
    .filter((c) => c.code === "FR" || c.count > 0)
    .sort((a, b) => (a.code === "FR" ? -1 : b.code === "FR" ? 1 : b.count - a.count))
    .slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink/10 bg-surface">
        {/* Halo discret, pas un dégradé plein écran — cohérent avec la consigne
            "éviter les dégradés violets excessifs" du design system. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-cobalt/10 blur-3xl dark:bg-cobalt/15"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <p className="stamp">Étudiants &amp; jeunes diplômés · France &amp; Europe</p>
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
          <dl className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-5 sm:gap-x-14">
            <div className="flex items-center gap-2.5">
              <Briefcase aria-hidden="true" size={20} className="text-cobalt" />
              <span>
                <dd className="text-2xl font-bold leading-none sm:text-3xl">{offerCount}</dd>
                <dt className="mt-0.5 text-sm text-ink/50">offres actives</dt>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Building2 aria-hidden="true" size={20} className="text-cobalt" />
              <span>
                <dd className="text-2xl font-bold leading-none sm:text-3xl">{companyCount}</dd>
                <dt className="mt-0.5 text-sm text-ink/50">entreprises</dt>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPinned aria-hidden="true" size={20} className="text-cobalt" />
              <span>
                <dd className="text-2xl font-bold leading-none sm:text-3xl">{cityCount}</dd>
                <dt className="mt-0.5 text-sm text-ink/50">villes</dt>
              </span>
            </div>
          </dl>

          {internationalCount > 0 && (
            <p className="mt-6 text-sm text-ink/55">
              Basé en France ? Regardez aussi{" "}
              <a
                href="#europe"
                className="font-semibold text-cobalt underline-offset-4 hover:underline"
              >
                {internationalCount} offre{internationalCount > 1 ? "s" : ""} ailleurs en Europe
              </a>
              .
            </p>
          )}
        </div>
      </section>

      {/* Europe & France : la offre-passerelle vers le multi-pays (§2.7-2.8
          de CONTEXTE_AI_WORK.md) — mise en avant éditoriale, pas de nouvelle
          restriction technique sur /offres?pays=. */}
      {europeCards.length > 1 && (
        <section
          id="europe"
          className="mx-auto max-w-6xl scroll-mt-6 px-4 pt-14"
          aria-labelledby="europe-titre"
        >
          <h2 id="europe-titre" className="text-2xl font-bold tracking-tight">
            Explorez l'Europe
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            France en priorité, avec un corpus grandissant d'offres ailleurs en Europe.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {europeCards.map((c) => (
              <Link
                key={c.code}
                href={
                  c.code === "FR" ? "/offres?contrat=STAGE,ALTERNANCE" : `/offres?pays=${c.code}`
                }
                className="card group flex items-center gap-3 p-4 hover:shadow-lift"
              >
                <span aria-hidden="true" className="text-2xl">
                  {c.code === "FR" ? "🇫🇷" : (COUNTRY_FLAGS[c.code] ?? "🇪🇺")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:text-cobalt">
                    {c.label}
                  </span>
                  <span className="text-sm text-ink/55">
                    {c.count > 0 ? `${c.count} offre${c.count > 1 ? "s" : ""}` : "Bientôt"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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

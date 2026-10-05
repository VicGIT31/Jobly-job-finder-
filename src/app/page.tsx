import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
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
      where: PUBLIC_OFFER_WHERE,
      include: { company: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    resolveCollections(),
    prisma.jobOffer.groupBy({
      by: ["specialty"],
      where: PUBLIC_OFFER_WHERE,
      _count: true,
    }),
    prisma.jobOffer.count({ where: PUBLIC_OFFER_WHERE }),
    prisma.company.count({ where: { offers: { some: PUBLIC_OFFER_WHERE } } }),
    prisma.jobOffer.groupBy({ by: ["city"], where: PUBLIC_OFFER_WHERE }).then((g) => g.length),
    // Répartition par pays — voir SOURCES_EUROPE_ASIA.md. Sert la section
    // "Explorez l'Europe" ci-dessous (focus Europe + France).
    prisma.jobOffer.groupBy({ by: ["countryCode"], where: PUBLIC_OFFER_WHERE, _count: true }),
  ]);

  const countBySpecialty = new Map(specialtyCounts.map((row) => [row.specialty, row._count]));
  const countByCountry = new Map(countryCounts.map((row) => [row.countryCode, row._count]));
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
      <section className="border-b border-ink/10 bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-cobalt">
              VOTRE PREMIÈRE EXPÉRIENCE TECH
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Un stage. Une alternance.
              <br />
              <span className="text-cobalt">Votre prochain départ.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
              Explorez les offres tech des entreprises et des sites de recrutement en France.
              Repérez votre mission, puis postulez sur l’annonce d’origine.
            </p>
            <div className="mt-7 rounded-xl border border-ink/15 bg-paper p-3 shadow-card">
              <HomeSearch />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link
                href="/offres?ville=Paris"
                className="font-medium text-cobalt underline-offset-4 hover:underline"
              >
                À Paris →
              </Link>
              <Link
                href="/offres?specialite=IA"
                className="font-medium text-cobalt underline-offset-4 hover:underline"
              >
                Data &amp; IA →
              </Link>
              <Link
                href="/offres?contrat=ALTERNANCE"
                className="font-medium text-cobalt underline-offset-4 hover:underline"
              >
                En alternance →
              </Link>
            </div>
          </div>
          <aside
            className="border-t border-ink/15 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0"
            aria-label="Le catalogue Jobly"
          >
            <p className="text-sm font-semibold text-ink/70">À explorer aujourd’hui</p>
            <dl className="mt-5 grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-6">
              {[
                { count: offerCount, label: "offres actives", icon: Briefcase },
                { count: companyCount, label: "entreprises qui recrutent", icon: Building2 },
                { count: cityCount, label: "villes", icon: MapPinned },
              ].map(({ count, label, icon: Icon }) => (
                <div key={label}>
                  <dt className="flex items-center gap-2 text-xs text-ink/65 sm:text-sm">
                    <Icon aria-hidden="true" size={16} className="hidden text-cobalt sm:block" />
                    {label}
                  </dt>
                  <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                    {count.toLocaleString("fr-FR")}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
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
        <div className="flex flex-wrap items-baseline justify-between gap-3">
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

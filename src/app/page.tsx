import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  KanbanSquare,
  MousePointerClick,
  Search,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { HomeSearch } from "@/components/home-search";
import { CompanyLogo } from "@/components/offers/company-logo";
import { ContractBadge } from "@/components/ui/contract-badge";
import { SpecialtyIcon } from "@/components/ui/specialty-icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { CollectionTabs } from "@/components/home/collection-tabs";
import { CompanyMarquee } from "@/components/home/company-marquee";
import { timeAgo } from "@/components/offers/offer-card";
import { resolveCollections } from "@/server/companies/collections";
import {
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  EUROPEAN_COUNTRIES,
  SPECIALTIES,
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

  // Bandeau défilant : les entreprises des vitrines, dédoublonnées, les plus
  // actives d'abord.
  const marqueeCompanies = Array.from(
    new Map(
      collections
        .flatMap((c) => c.companies)
        .sort((a, b) => b.offerCount - a.offerCount)
        .map((c) => [c.slug, { slug: c.slug, name: c.name }]),
    ).values(),
  ).slice(0, 18);

  const collectionTabs = collections
    .filter((c) => c.companies.length > 0)
    .map((c) => ({
      key: c.key,
      label: c.label,
      tagline: c.tagline,
      icon: c.icon,
      totalOffers: c.totalOffers,
      companies: c.companies.map((co) => ({
        slug: co.slug,
        name: co.name,
        logoUrl: co.logoUrl,
        offerCount: co.offerCount,
      })),
    }));

  const maxSpecialty = Math.max(1, ...SPECIALTIES.map((s) => countBySpecialty.get(s) ?? 0));
  const heroFeed = recentOffers.slice(0, 3);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="bg-grid mask-fade-b absolute inset-x-0 top-0 -z-10 h-[620px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 -z-10 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-accent/[0.13] blur-[120px] dark:bg-accent/[0.18]"
        />

        <div className="container-page grid grid-cols-1 gap-14 pb-16 pt-12 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pb-24 lg:pt-24">
          <div>
            <p className="inline-flex animate-fade-up items-center gap-2.5 rounded-full border border-line bg-paper/80 py-1 pl-2 pr-3.5 text-[13px] text-ink/70 shadow-card backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-success" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                <strong className="font-mono font-semibold tabular-nums text-ink">
                  {offerCount.toLocaleString("fr-FR")}
                </strong>{" "}
                offres tech actives
              </span>
            </p>

            <h1 className="mt-7 animate-rise text-display-lg font-semibold">
              Un stage.
              <br />
              Une alternance.
              <br />
              <span className="serif-accent text-accent">Votre prochain départ.</span>
            </h1>
            <p className="mt-7 max-w-xl animate-fade-up text-lg leading-relaxed text-ink/65 [animation-delay:120ms]">
              Les offres tech des entreprises et des sites de recrutement en France, réunies en un
              seul endroit. Repérez votre mission, puis postulez sur l&apos;annonce d&apos;origine.
            </p>

            <div className="mt-9 max-w-2xl animate-fade-up [animation-delay:180ms]">
              <HomeSearch />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="mr-1 text-ink/60">Populaire :</span>
                {[
                  { href: "/offres?ville=Paris&rayon=20", label: "Paris" },
                  { href: "/offres?specialite=IA", label: "Data & IA" },
                  { href: "/offres?contrat=ALTERNANCE", label: "Alternance" },
                  { href: "/offres?remote=FULL", label: "Full remote" },
                  { href: "/offres?specialite=CYBERSECURITE", label: "Cybersécurité" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="chip !min-h-[30px] text-[13px]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Fil des dernières offres : un aperçu du produit avec de vraies données. */}
          {heroFeed.length > 0 && (
            <div className="relative hidden lg:block" aria-label="Dernières offres publiées">
              <div className="flex items-center justify-between">
                <p className="eyebrow">En direct du catalogue</p>
                <Link href="/offres" className="link text-xs">
                  Tout voir
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {heroFeed.map((offer, i) => (
                  <li
                    key={offer.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${240 + i * 90}ms` }}
                  >
                    <Link
                      href={`/offres/${offer.slug}`}
                      className="card-interactive group flex gap-3.5 p-4"
                      style={{ marginLeft: `${i * 18}px`, marginRight: `${(2 - i) * 18}px` }}
                    >
                      <CompanyLogo
                        name={offer.company.name}
                        logoUrl={offer.company.logoUrl}
                        slug={offer.company.slug}
                        website={offer.company.website}
                        size={40}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-xs text-ink/60">
                          <span className="truncate">{offer.company.name}</span>
                          <span className="shrink-0 font-mono text-2xs">
                            {timeAgo(offer.publishedAt.getTime())}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-accent">
                          {offer.title}
                        </span>
                        <span className="mt-2.5 flex items-center gap-2">
                          <ContractBadge type={offer.contractType} className="!py-0.5" />
                          <span className="truncate text-xs text-ink/60">{offer.city}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Chiffres clés */}
        <div className="border-y border-line bg-paper/60">
          <dl className="container-page grid grid-cols-3 divide-x divide-line">
            {[
              { count: offerCount, label: "offres actives" },
              { count: companyCount, label: "entreprises qui recrutent" },
              { count: cityCount, label: "villes couvertes" },
            ].map(({ count, label }) => (
              <div key={label} className="px-3 py-6 first:pl-0 sm:px-8 sm:py-8">
                <dt className="eyebrow !text-[10px] sm:!text-2xs">{label}</dt>
                <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-[-0.04em] sm:text-4xl">
                  {count.toLocaleString("fr-FR")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {marqueeCompanies.length >= 6 && (
        <section className="container-page pt-14" aria-labelledby="ils-recrutent">
          <h2 id="ils-recrutent" className="eyebrow text-center">
            Ils recrutent en ce moment
          </h2>
          <div className="mt-6">
            <CompanyMarquee companies={marqueeCompanies} />
          </div>
        </section>
      )}

      {/* ── Spécialités ──────────────────────────────────────────────────── */}
      <section className="container-page pt-24" aria-labelledby="specialites">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">01 — Spécialités</p>
            <h2 id="specialites" className="mt-3 text-display-sm font-semibold">
              Par où <span className="serif-accent">commencer</span> ?
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink/60">
            Six familles de métiers tech, classées automatiquement à partir de chaque annonce.
          </p>
        </Reveal>
        <Stagger className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((specialty, i) => {
            const count = countBySpecialty.get(specialty) ?? 0;
            return (
              <StaggerItem key={specialty}>
                <Link
                  href={`/offres?specialite=${specialty}`}
                  className="card-interactive group relative flex h-full flex-col overflow-hidden p-6"
                >
                  <span className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface/70 text-ink transition-colors duration-base group-hover:border-transparent group-hover:bg-volt group-hover:text-volt-ink">
                      <SpecialtyIcon specialty={specialty} size={20} />
                    </span>
                    <span className="font-mono text-2xs text-ink/60">0{i + 1}</span>
                  </span>
                  <span className="mt-10 flex items-end justify-between gap-3">
                    <span>
                      <span className="block text-lg font-semibold tracking-tight">
                        {SPECIALTY_LABELS[specialty]}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-ink/60">
                        {count.toLocaleString("fr-FR")} offre{count > 1 ? "s" : ""}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      size={20}
                      className="text-ink/25 transition-all duration-base ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </span>
                  {/* Jauge relative du volume d'offres */}
                  <span
                    aria-hidden="true"
                    className="mt-4 block h-1 overflow-hidden rounded-full bg-ink/[0.06]"
                  >
                    <span
                      className="block h-full origin-left rounded-full bg-ink/25 transition-[transform,background-color] duration-slow ease-out group-hover:bg-accent"
                      style={{ width: `${Math.max(4, (count / maxSpecialty) * 100)}%` }}
                    />
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* ── Offres récentes ──────────────────────────────────────────────── */}
      <section className="container-page pt-24" aria-labelledby="recentes">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">02 — Nouveautés</p>
            <h2 id="recentes" className="mt-3 text-display-sm font-semibold">
              Fraîchement <span className="serif-accent">publiées</span>
            </h2>
          </div>
          <Link href="/offres" className="btn-outline btn-sm group">
            Toutes les offres
            <ArrowRight
              aria-hidden="true"
              size={15}
              className="transition-transform duration-base group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>
        <Stagger className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentOffers.map((offer) => (
            <StaggerItem key={offer.id} className="h-full">
              <OfferCard offer={offerToDocument(offer)} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Vitrines d'entreprises ───────────────────────────────────────── */}
      {collectionTabs.length > 0 && (
        <section className="container-page pt-24" aria-labelledby="vitrines">
          <Reveal>
            <p className="eyebrow">03 — Entreprises</p>
            <h2 id="vitrines" className="mt-3 text-display-sm font-semibold">
              Des grands groupes aux <span className="serif-accent">licornes</span>
            </h2>
          </Reveal>
          <Reveal className="mt-8" delay={0.08}>
            <CollectionTabs collections={collectionTabs} />
          </Reveal>
        </section>
      )}

      {/* ── Europe ───────────────────────────────────────────────────────── */}
      {/* Europe & France : la offre-passerelle vers le multi-pays (§2.7-2.8
          de CONTEXTE_AI_WORK.md) — mise en avant éditoriale, pas de nouvelle
          restriction technique sur /offres?pays=. */}
      {europeCards.length > 1 && (
        <section
          id="europe"
          className="container-page scroll-mt-24 pt-24"
          aria-labelledby="europe-titre"
        >
          <Reveal>
            <p className="eyebrow">04 — International</p>
            <h2 id="europe-titre" className="mt-3 text-display-sm font-semibold">
              Explorez l&apos;<span className="serif-accent">Europe</span>
            </h2>
            <p className="mt-3 text-sm text-ink/60">
              France en priorité, avec un corpus grandissant d&apos;offres ailleurs en Europe.
            </p>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {europeCards.map((c) => (
              <StaggerItem key={c.code}>
                <Link
                  href={
                    c.code === "FR" ? "/offres?contrat=STAGE,ALTERNANCE" : `/offres?pays=${c.code}`
                  }
                  className="card-interactive group flex items-center gap-3 p-4"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {c.code === "FR" ? "🇫🇷" : (COUNTRY_FLAGS[c.code] ?? "🇪🇺")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:text-accent">
                      {c.label}
                    </span>
                    <span className="font-mono text-2xs text-ink/60">
                      {c.count > 0 ? `${c.count} offre${c.count > 1 ? "s" : ""}` : "Bientôt"}
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* ── Mode d'emploi + appel à l'action ─────────────────────────────── */}
      <section className="container-page pt-24" aria-labelledby="mode-emploi">
        <Reveal className="surface-night relative overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-volt/25 blur-[90px]"
          />
          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-end">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.14em] text-white/50">
                Mode d&apos;emploi
              </p>
              <h2 id="mode-emploi" className="mt-4 text-display-sm font-semibold">
                Moins de recherche, <span className="serif-accent text-volt">plus de réponses</span>
                .
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/offres" className="btn-volt">
                  Explorer les offres
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
                <Link
                  href="/inscription"
                  className="btn border border-white/20 text-white hover:bg-white/10"
                >
                  Créer un compte
                </Link>
              </div>
            </div>
            <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Search,
                  title: "Cherchez",
                  text: "Filtrez par spécialité, ville, rayon, télétravail et contrat.",
                },
                {
                  icon: MousePointerClick,
                  title: "Postulez à la source",
                  text: "Le bouton Postuler ouvre l'annonce d'origine, jamais un intermédiaire.",
                },
                {
                  icon: Bell,
                  title: "Recevez des alertes",
                  text: "Transformez une recherche en alerte email en un clic.",
                },
                {
                  icon: KanbanSquare,
                  title: "Suivez vos candidatures",
                  text: "Un tableau de suivi, des rappels de relance et vos statistiques.",
                },
              ].map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="border-t border-white/15 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xs text-white/40">0{i + 1}</span>
                    <Icon aria-hidden="true" size={17} className="text-volt" />
                  </div>
                  <p className="mt-3 font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, Factory, GraduationCap,
  HeartPulse, Laptop, MapPin, Sprout, Truck, Utensils, Wrench, type LucideIcon,
} from "lucide-react";
import { HomeSearch } from "@/components/home-search";
import { CompanyLogo } from "@/components/offers/company-logo";
import { ContractBadge } from "@/components/ui/contract-badge";
import { OfferCard } from "@/components/offers/offer-card";
import { UNIVERSES, UNIVERSE_LABELS } from "@/lib/job-taxonomy";
import { prisma } from "@/lib/prisma";
import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import { offerToDocument } from "@/server/search/sync";

export const dynamic = "force-dynamic";
const ICONS: Record<string, LucideIcon> = {
  TECH: Laptop, COMMERCE: Building2, HOSPITALITY: Utensils, HEALTH: HeartPulse,
  CONSTRUCTION: Wrench, INDUSTRY: Factory, TRANSPORT: Truck, AGRICULTURE: Sprout, EDUCATION: GraduationCap,
};
const featured = ["HEALTH", "CONSTRUCTION", "TRANSPORT", "TECH", "HOSPITALITY", "INDUSTRY"] as const;
const contracts = [["CDI", "CDI"], ["CDD", "CDD"], ["STAGE", "Stages"], ["ALTERNANCE", "Alternance"], ["INTERIM", "Intérim"]] as const;

export default async function HomePage() {
  const [domains, offers] = await Promise.all([
    prisma.jobOffer.groupBy({ by: ["universe"], where: PUBLIC_OFFER_WHERE, _count: true }),
    prisma.jobOffer.findMany({ where: PUBLIC_OFFER_WHERE, include: { company: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 3 }),
  ]);
  const counts = new Map(domains.map((row) => [row.universe, row._count]));
  const total = domains.reduce((sum, row) => sum + row._count, 0);
  return (
    <>
      <section className="national-hero">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_90%_at_38%_0%,black,transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_56%_76%_at_44%_0%,rgb(var(--accent)/.14),transparent)]" />
        <div className="container-page national-hero-content">
          <div className="national-hero-layout">
            <div>
              <p className="national-landmark"><MapPin size={17} aria-hidden="true" /> {total.toLocaleString("fr-FR")} offres actives en France</p>
              <h1>Tous les métiers.<br /><span className="serif-accent text-accent">Votre prochain départ.</span></h1>
              <p className="national-intro">Cherchez un emploi, un stage ou une alternance, près de chez vous ou partout en France.</p>
            </div>
            {offers.length > 0 && <aside className="hidden min-w-0 lg:block" aria-label="Dernières offres du catalogue">
              <h2 className="text-sm font-semibold text-ink/75">Ajoutées récemment</h2>
              <ul className="mt-3 space-y-2 pb-1">
                {offers.map((offer, index) => <li key={offer.id} style={{ marginLeft: index * 12, marginRight: (2 - index) * 12 }}>
                  <Link href={`/offres/${offer.slug}`} className="card-interactive flex items-center gap-3 p-3">
                    <CompanyLogo name={offer.company.name} slug={offer.company.slug} logoUrl={offer.company.logoUrl} size={36} />
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{offer.title}</strong><span className="block truncate text-xs text-ink/70">{offer.city}</span></span>
                    <ContractBadge type={offer.contractType} />
                  </Link>
                </li>)}
              </ul>
            </aside>}

          </div>
          <HomeSearch />
          <div className="national-shortcuts" aria-label="Contrats fréquents">
            {contracts.map(([key, label]) => <Link key={key} href={`/offres?contrat=${key}`}>{label}</Link>)}
            <Link href="/offres?metier=CATEGORY_MANAGER">Category Manager</Link>
          </div>
        </div>
      </section>

      <section className="container-page national-section" aria-labelledby="explorer-domaines">
        <div className="national-section-title">
          <h2 id="explorer-domaines">Explorer par domaine</h2>
          <Link className="link" href="/offres">Voir toutes les offres <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="national-domains">
          {[...featured, ...UNIVERSES.filter((key) => !(featured as readonly string[]).includes(key))].map((domain) => {
            const Icon = ICONS[domain] ?? BriefcaseBusiness;
            const count = counts.get(domain) ?? 0;
            return <Link className="national-domain" href={`/offres?univers=${domain}`} key={domain}>
              <span className="national-domain-icon"><Icon size={20} aria-hidden="true" /></span>
              <span><strong>{UNIVERSE_LABELS[domain]}</strong><small>{count.toLocaleString("fr-FR")} offre{count === 1 ? "" : "s"}</small></span>
              <ArrowUpRight className="ml-auto shrink-0 text-ink/45" size={17} aria-hidden="true" />
            </Link>;
          })}
        </div>
      </section>

      <section className="container-page national-section" aria-labelledby="dernieres-offres">
        <div className="national-section-title">
          <h2 id="dernieres-offres">Dernières offres ajoutées</h2>
          <Link className="link" href="/offres?tri=date">Voir les offres récentes <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {offers.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => <OfferCard key={offer.id} offer={offerToDocument(offer)} />)}
        </div> : <p className="rounded-xl border border-line bg-paper p-6 text-ink/70">Les annonces apparaîtront ici au fil de l’actualisation.</p>}
      </section>
    </>
  );
}

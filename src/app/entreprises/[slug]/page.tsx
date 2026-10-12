import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Briefcase, Building2, ChevronRight, Users } from "lucide-react";
import { CompanyLogo } from "@/components/offers/company-logo";
import { companySizeLabel, isPlaceholderDescription } from "@/components/companies/company-text";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { COUNTRY_FLAGS, COUNTRY_LABELS } from "@/lib/search-params";

export const dynamic = "force-dynamic";

async function getCompany(slug: string) {
  return prisma.company.findUnique({
    where: { slug },
    include: {
      offers: {
        where: PUBLIC_OFFER_WHERE,
        include: { company: true },
        orderBy: { publishedAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await pendingParams;
  const company = await getCompany(params.slug);
  if (!company) return { title: "Entreprise introuvable" };
  return {
    title: `${company.name} — offres et présentation`,
    description: company.description.slice(0, 160),
  };
}

export default async function EntreprisePage({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await pendingParams;
  const company = await getCompany(params.slug);
  if (!company) notFound();

  // Pays dérivés des offres actives (pas de champ dédié sur Company) —
  // affiché seulement au-delà d'un seul pays, pour ne pas ajouter de bruit
  // aux entreprises purement françaises (spec: focus Europe/France).
  const countries = Array.from(new Set(company.offers.map((o) => o.countryCode))).sort((a, b) =>
    a === "FR" ? -1 : b === "FR" ? 1 : a.localeCompare(b),
  );

  const offerCount = company.offers.length;

  return (
    <div className="container-page pb-8 pt-6">
      <nav aria-label="Fil d'Ariane" className="text-[13px] text-ink/60">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/entreprises" className="transition-colors hover:text-ink">
              Entreprises
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={13} />
          </li>
          <li className="truncate text-ink/70" aria-current="page">
            {company.name}
          </li>
        </ol>
      </nav>

      <header className="relative mt-6 overflow-hidden rounded-3xl border border-line bg-paper p-6 shadow-card sm:p-10">
        <div
          aria-hidden="true"
          className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_100%_0%,black,transparent)]"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            slug={company.slug}
            website={company.website}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-display-sm font-semibold">{company.name}</h1>
              {company.featured && <span className="stamp">À la une</span>}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink/60">
              <span className="flex items-center gap-1.5">
                <Building2 aria-hidden="true" size={15} className="text-ink/40" />
                {company.sector}
              </span>
              {companySizeLabel(company.size) && (
                <span className="flex items-center gap-1.5">
                  <Users aria-hidden="true" size={15} className="text-ink/40" />
                  {companySizeLabel(company.size)}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex items-center gap-1"
                >
                  Site web <ArrowUpRight aria-hidden="true" size={14} />
                </a>
              )}
            </p>
            {countries.length > 1 && (
              <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-ink/70">
                <span className="eyebrow mr-1">Recrute en</span>
                {countries.map((c) => (
                  <span key={c} className="ticket !min-h-[28px] text-xs">
                    {c !== "FR" && <span aria-hidden="true">{COUNTRY_FLAGS[c] ?? "🌍"}</span>}
                    {COUNTRY_LABELS[c] ?? c}
                  </span>
                ))}
              </p>
            )}
            {!isPlaceholderDescription(company.description) && (
              <p className="mt-5 max-w-3xl leading-relaxed text-ink/75">{company.description}</p>
            )}
          </div>
          <div className="shrink-0 rounded-2xl border border-line bg-surface/60 px-5 py-4 sm:text-right">
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-[-0.04em]">
              {offerCount}
            </p>
            <p className="eyebrow mt-1">
              offre{offerCount > 1 ? "s" : ""} active{offerCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="offres-entreprise">
        <h2 id="offres-entreprise" className="text-xl font-semibold tracking-tight">
          Postes ouverts chez {company.name}
        </h2>
        {offerCount > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-3">
            {company.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offerToDocument(offer)} layout="row" />
            ))}
          </div>
        ) : (
          <div className="empty-state mt-6">
            <Briefcase aria-hidden="true" size={24} className="text-ink/40" />
            <p className="mt-3 font-semibold">Aucune offre active pour le moment</p>
            <p className="mt-1 text-sm text-ink/60">
              Les nouvelles annonces apparaissent ici dès leur collecte.
            </p>
            <Link href="/offres" className="btn-outline btn-sm mt-5">
              Voir toutes les offres
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

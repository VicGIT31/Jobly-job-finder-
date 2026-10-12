import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CompanyLogo } from "@/components/offers/company-logo";
import { CompanyFilter } from "@/components/companies/company-filter";
import { companySizeLabel, isPlaceholderDescription } from "@/components/companies/company-text";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Les entreprises qui recrutent",
  description:
    "Découvrez les entreprises qui recrutent des étudiants et jeunes diplômés sur Jobly.",
};

export default async function EntreprisesPage() {
  const companies = await prisma.company.findMany({
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { offers: { where: PUBLIC_OFFER_WHERE } } },
    },
  });

  // Présentation : à la une d'abord, puis les entreprises qui recrutent.
  const sorted = [...companies].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      Number(b._count.offers > 0) - Number(a._count.offers > 0),
  );
  const hiring = companies.filter((c) => c._count.offers > 0).length;

  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <p className="eyebrow">Annuaire</p>
          <h1 className="mt-3 text-display-sm font-semibold">
            Les entreprises <span className="serif-accent text-accent">qui recrutent</span>.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink/60">
          {hiring} entreprises ont des offres de stage ou d&apos;alternance actives. Ouvrez une
          fiche pour voir tous ses postes ouverts.
        </p>
      </header>

      <div className="mt-6">
        <CompanyFilter total={companies.length} hiring={hiring}>
          {sorted.map((company) => {
            const count = company._count.offers;
            return (
              <li
                key={company.id}
                data-name={`${company.name} ${company.sector}`}
                data-active={count > 0 ? "1" : "0"}
              >
                <Link href={`/entreprises/${company.slug}`} className="dir-card group">
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      name={company.name}
                      logoUrl={company.logoUrl}
                      slug={company.slug}
                      website={company.website}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="dir-name">
                        {company.name}
                        {company.featured && <span className="stamp ml-2 !text-2xs">À la une</span>}
                      </h2>
                      <p className="dir-meta">
                        {[company.sector, companySizeLabel(company.size)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {!isPlaceholderDescription(company.description) && (
                    <p className="dir-desc">{company.description}</p>
                  )}
                  <p className="dir-count" data-on={count > 0 || undefined}>
                    {count} offre{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </CompanyFilter>
      </div>
    </div>
  );
}

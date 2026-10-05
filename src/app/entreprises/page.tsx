import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Les entreprises<span className="text-cobalt">.</span>
      </h1>
      <p className="mt-1 text-ink/70">
        {companies.length} entreprises recrutent des étudiants et jeunes diplômés.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/entreprises/${company.slug}`}
            className="card group p-5 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-bold group-hover:text-cobalt">
                {company.name}
              </h2>
              {company.featured && <span className="stamp">À la une</span>}
            </div>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">
              {company.sector} · {company.size} salariés
            </p>
            <p className="mt-3 line-clamp-3 text-sm text-ink/75">{company.description}</p>
            <p className="rule mt-4 pt-2 text-sm font-semibold">
              {company._count.offers} offre{company._count.offers > 1 ? "s" : ""} active
              {company._count.offers > 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

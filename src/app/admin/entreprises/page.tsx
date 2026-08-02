import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, StatCard, Th } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCompany, toggleCompanyFeatured } from "@/server/admin/actions";

export const metadata: Metadata = { title: "Admin — Entreprises" };

const PAGE_SIZE = 25;

/** Gestion des entreprises : mise en avant sur l'accueil et suppression. */
export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; filtre?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim() ?? "";
  const filtre = searchParams.filtre === "avant" ? "avant" : undefined;

  const where = {
    ...(filtre === "avant" ? { featured: true } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [companies, total, featuredCount] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { offers: true } },
      },
    }),
    prisma.company.count({ where }),
    prisma.company.count({ where: { featured: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageParams = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filtre) params.set("filtre", filtre);
    params.set("page", String(n));
    return params.toString();
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Entreprises listées" value={total} />
        <StatCard label="Mises en avant sur l'accueil" value={featuredCount} tone="accent" />
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <div className="flex-1 sm:max-w-xs">
          <label htmlFor="q" className="mb-1 block text-sm font-semibold">
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} className="input-ink" placeholder="Nom" />
        </div>
        <div>
          <label htmlFor="filtre" className="mb-1 block text-sm font-semibold">
            Filtre
          </label>
          <select
            id="filtre"
            name="filtre"
            defaultValue={filtre ?? ""}
            className="input-ink !w-auto"
          >
            <option value="">Toutes</option>
            <option value="avant">Mises en avant</option>
          </select>
        </div>
        <button type="submit" className="btn-outline !min-h-[44px]">
          Filtrer
        </button>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left">
              <Th>Entreprise</Th>
              <Th>Secteur</Th>
              <Th>Offres</Th>
              <Th>Accueil</Th>
              <Th className="pr-0">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-ink/15">
                <td className="max-w-[280px] py-2.5 pr-4">
                  <Link
                    href={`/entreprises/${company.slug}`}
                    className="block truncate font-semibold underline-offset-4 hover:text-cobalt hover:underline"
                  >
                    {company.name}
                  </Link>
                  <span className="text-xs text-ink/50">{company.size}</span>
                </td>
                <td className="py-2.5 pr-4 text-ink/70">{company.sector}</td>
                <td className="py-2.5 pr-4 tabular-nums">{company._count.offers}</td>
                <td className="py-2.5 pr-4">
                  {company.featured ? <Badge tone="accent">En avant</Badge> : <Badge>—</Badge>}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <form action={toggleCompanyFeatured.bind(null, company.id)}>
                      <button
                        type="submit"
                        className="text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
                      >
                        {company.featured ? "Retirer de l'accueil" : "Mettre en avant"}
                      </button>
                    </form>
                    <form action={deleteCompany.bind(null, company.id)}>
                      <ConfirmButton
                        message={`Supprimer ${company.name} et ses ${company._count.offers} offre(s) ? Cette action est définitive.`}
                      >
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/50">
                  Aucune entreprise ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination des entreprises"
          className="rule mt-4 flex items-center gap-4 pt-3 text-sm"
        >
          {page > 1 && (
            <Link
              href={`/admin/entreprises?${pageParams(page - 1)}`}
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              ← Précédent
            </Link>
          )}
          <span className="text-ink/60">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/entreprises?${pageParams(page + 1)}`}
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}

      <p className="mt-6 text-xs text-ink/45">
        Les fiches entreprises sont créées automatiquement à l&apos;ingestion. Supprimer une
        entreprise supprime aussi ses offres (base et index de recherche).
      </p>
    </div>
  );
}

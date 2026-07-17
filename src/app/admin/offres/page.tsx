import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleOfferStatus } from "@/server/admin/actions";
import { CONTRACT_LABELS } from "@/lib/search-params";

export const metadata: Metadata = { title: "Admin — Modération des offres" };

const PAGE_SIZE = 25;

export default async function AdminOffresPage({
  searchParams,
}: {
  searchParams: { page?: string; statut?: string; q?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const statut =
    searchParams.statut === "EXPIRED"
      ? "EXPIRED"
      : searchParams.statut === "ACTIVE"
        ? "ACTIVE"
        : undefined;
  const q = searchParams.q?.trim() ?? "";

  const where = {
    ...(statut ? { status: statut as "ACTIVE" | "EXPIRED" } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [offers, total] = await Promise.all([
    prisma.jobOffer.findMany({
      where,
      include: { company: true, _count: { select: { applyClicks: true } } },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobOffer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = new URLSearchParams();
  if (statut) baseParams.set("statut", statut);
  if (q) baseParams.set("q", q);

  return (
    <div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex-1 sm:max-w-xs">
          <label htmlFor="q" className="mb-1 block text-sm font-semibold">
            Recherche
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="input-ink"
            placeholder="Titre ou entreprise"
          />
        </div>
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-semibold">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={statut ?? ""}
            className="input-ink !w-auto"
          >
            <option value="">Tous</option>
            <option value="ACTIVE">Actives</option>
            <option value="EXPIRED">Expirées</option>
          </select>
        </div>
        <button type="submit" className="btn-outline !min-h-[44px]">
          Filtrer
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/70">
        {total} offre{total > 1 ? "s" : ""}
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left">
              <th
                scope="col"
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Offre
              </th>
              <th
                scope="col"
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Contrat
              </th>
              <th
                scope="col"
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Source
              </th>
              <th
                scope="col"
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Clics
              </th>
              <th
                scope="col"
                className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Statut
              </th>
              <th
                scope="col"
                className="py-2 text-xs font-semibold uppercase tracking-wide text-ink/50"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-ink/15">
                <td className="max-w-[300px] py-2.5 pr-4">
                  <Link
                    href={`/offres/${offer.slug}`}
                    className="block truncate font-semibold underline-offset-4 hover:text-cobalt hover:underline"
                  >
                    {offer.title}
                  </Link>
                  <span className="text-xs text-ink/55">
                    {offer.company.name} · {offer.city}
                  </span>
                </td>
                <td className="py-2.5 pr-4">{CONTRACT_LABELS[offer.contractType]}</td>
                <td className="py-2.5 pr-4 text-ink/70">{offer.sourceSite}</td>
                <td className="py-2.5 pr-4 tabular-nums">{offer._count.applyClicks}</td>
                <td className="py-2.5 pr-4">
                  {offer.status === "ACTIVE" ? (
                    <span className="stamp !border-cobalt !text-[10px] text-cobalt">Active</span>
                  ) : (
                    <span className="stamp !text-[10px] opacity-60">Expirée</span>
                  )}
                </td>
                <td className="py-2.5">
                  <form action={toggleOfferStatus.bind(null, offer.id)}>
                    <button
                      type="submit"
                      className="text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
                    >
                      {offer.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/50">
                  Aucune offre ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination admin"
          className="rule mt-4 flex items-center gap-4 pt-3 text-sm"
        >
          {page > 1 && (
            <Link
              href={`/admin/offres?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page - 1) })}`}
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
              href={`/admin/offres?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page + 1) })}`}
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteOffer, toggleOfferStatus } from "@/server/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CONTRACT_LABELS } from "@/lib/search-params";

export const metadata: Metadata = { title: "Admin — Modération des offres" };

const PAGE_SIZE = 25;

export default async function AdminOffresPage({
  searchParams: pendingSearchParams,
}: {
  searchParams: Promise<{ page?: string; statut?: string; q?: string }>;
}) {
  const searchParams = await pendingSearchParams;
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
          <label htmlFor="q" className="field-label">
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
          <label htmlFor="statut" className="field-label">
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
        <button type="submit" className="btn-outline">
          Filtrer
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/70">
        {total} offre{total > 1 ? "s" : ""}
      </p>

      <div className="table-shell mt-2">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <thead>
            <tr className="border-b border-line bg-surface/50 text-left">
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Offre
              </th>
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Contrat
              </th>
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Source
              </th>
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Clics
              </th>
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Statut
              </th>
              <th
                scope="col"
                className="whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr
                key={offer.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-ink/[0.02]"
              >
                <td className="max-w-[300px] py-2.5 pr-4">
                  <Link
                    href={`/offres/${offer.slug}`}
                    className="block truncate font-semibold transition-colors hover:text-accent"
                  >
                    {offer.title}
                  </Link>
                  <span className="text-xs text-ink/60">
                    {offer.company.name} · {offer.city}
                  </span>
                </td>
                <td className="py-2.5 pr-4">{CONTRACT_LABELS[offer.contractType]}</td>
                <td className="py-2.5 pr-4 text-ink/70">{offer.sourceSite}</td>
                <td className="py-2.5 pr-4 tabular-nums">{offer._count.applyClicks}</td>
                <td className="py-2.5 pr-4">
                  {offer.status === "ACTIVE" ? (
                    <span className="stamp !text-[10px]">Active</span>
                  ) : offer.blockedAt ? (
                    <span
                      className="stamp !text-[10px] opacity-80"
                      title="Bloquée en modération : l'ingestion ne la réactivera pas."
                    >
                      Bloquée
                    </span>
                  ) : (
                    <span className="stamp !text-[10px] opacity-60">Expirée</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <form action={toggleOfferStatus.bind(null, offer.id)}>
                      <button type="submit" className="link text-sm">
                        {offer.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
                      </button>
                    </form>
                    <form action={deleteOffer.bind(null, offer.id)}>
                      <ConfirmButton
                        message={`Supprimer définitivement « ${offer.title} » ? L'offre disparaîtra de la base et de l'index.`}
                      >
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/60">
                  Aucune offre ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-ink/60">
        « Désactiver » bloque l&apos;offre durablement : l&apos;ingestion la retrouvera sur la
        source mais ne la remettra pas en ligne. « Supprimer » l&apos;efface de la base — si la
        source la publie encore, elle sera ré-ingérée au cycle suivant.
      </p>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination admin"
          className="rule mt-4 flex items-center gap-4 pt-3 text-sm"
        >
          {page > 1 && (
            <Link
              href={`/admin/offres?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page - 1) })}`}
              className="link"
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
              className="link"
            >
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

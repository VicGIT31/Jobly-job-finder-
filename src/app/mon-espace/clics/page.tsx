import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Historique Postuler" };

export default async function ClicsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const clicks = await prisma.applyClick.findMany({
    where: { userId: session.user.id },
    include: { offer: { include: { company: true } } },
    orderBy: { clickedAt: "desc" },
    take: 100,
  });

  return (
    <section aria-labelledby="clics-titre">
      <h2 id="clics-titre" className="font-display text-xl font-bold">
        Historique de vos clics « Postuler »
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Chaque clic vous a redirigé·e vers le site source de l'offre.
      </p>

      {clicks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink/70">Aucun clic pour le moment.</p>
          <Link href="/offres" className="btn-cobalt mt-4">
            Explorer les offres
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
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
                  Entreprise
                </th>
                <th
                  scope="col"
                  className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Source
                </th>
                <th
                  scope="col"
                  className="py-2 text-xs font-semibold uppercase tracking-wide text-ink/50"
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {clicks.map((click) => (
                <tr key={click.id} className="border-b border-ink/15">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/offres/${click.offer.slug}`}
                      className="font-semibold underline-offset-4 hover:text-cobalt hover:underline"
                    >
                      {click.offer.title}
                    </Link>
                    {click.offer.status === "EXPIRED" && (
                      <span className="ml-2 text-xs text-ink/50">(expirée)</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{click.offer.company.name}</td>
                  <td className="py-2.5 pr-4 text-ink/70">{click.offer.sourceSite}</td>
                  <td className="py-2.5 tabular-nums text-ink/70">
                    {click.clickedAt.toLocaleDateString("fr-FR")}{" "}
                    {click.clickedAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

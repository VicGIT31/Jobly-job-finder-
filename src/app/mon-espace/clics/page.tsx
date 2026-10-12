import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MousePointerClick } from "lucide-react";
import { AccountEmptyState, SectionHeader } from "@/components/account/section-header";

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
      <SectionHeader
        id="clics-titre"
        title="Historique « Postuler »"
        description="Chaque clic vous a redirigé·e vers le site source de l'offre."
      />

      {clicks.length === 0 ? (
        <AccountEmptyState
          icon={<MousePointerClick aria-hidden="true" size={22} />}
          title="Aucun clic pour le moment"
          action={
            <Link href="/offres" className="btn-cobalt">
              Explorer les offres
            </Link>
          }
        >
          Vos clics sur « Postuler » apparaîtront ici, du plus récent au plus ancien.
        </AccountEmptyState>
      ) : (
        <div className="table-shell mt-6">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-left">
                {["Offre", "Entreprise", "Source", "Date"].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clicks.map((click) => (
                <tr
                  key={click.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  <td className="max-w-[280px] px-4 py-3">
                    <Link
                      href={`/offres/${click.offer.slug}`}
                      className="line-clamp-2 font-medium transition-colors hover:text-accent"
                    >
                      {click.offer.title}
                    </Link>
                    {click.offer.status === "EXPIRED" && (
                      <span className="mt-1 inline-block rounded-full bg-ink/[0.07] px-2 py-0.5 text-2xs text-ink/60">
                        Expirée
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/80">{click.offer.company.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">
                    {click.offer.sourceSite}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-ink/60">
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

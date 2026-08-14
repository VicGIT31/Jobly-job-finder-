import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { followUpFlag } from "@/lib/follow-up";
import {
  ApplicationBoard,
  type ApplicationItem,
} from "@/components/applications/application-board";

export const metadata: Metadata = { title: "Candidatures" };
export const dynamic = "force-dynamic";

export default async function CandidaturesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/mon-espace/candidatures");

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    include: {
      offer: { select: { slug: true, status: true } },
      // Dernier changement de statut : base du rappel de relance (pas
      // `updatedAt`, qui bouge aussi quand on édite juste une note).
      history: { orderBy: { changedAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items: ApplicationItem[] = applications.map((a) => {
    const statusChangedAt = a.history[0]?.changedAt ?? a.createdAt;
    return {
      id: a.id,
      offerId: a.offerId,
      offerSlug: a.offer?.slug ?? null,
      offerExpired: a.offer?.status === "EXPIRED",
      companyName: a.companyName,
      jobTitle: a.jobTitle,
      companyLogoUrl: a.companyLogoUrl,
      sourceUrl: a.sourceUrl,
      status: a.status,
      notes: a.notes,
      appliedAtTs: a.appliedAt ? a.appliedAt.getTime() : null,
      createdAtTs: a.createdAt.getTime(),
      followUp: followUpFlag(a.status, statusChangedAt),
    };
  });

  const needsAttention = items.filter((i) => i.followUp).length;

  return (
    <section aria-labelledby="candidatures-titre">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="candidatures-titre" className="font-display text-xl font-bold">
          {items.length} candidature{items.length > 1 ? "s" : ""} suivie
          {items.length > 1 ? "s" : ""}
        </h2>
        {needsAttention > 0 && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <span aria-hidden="true">⚠</span> {needsAttention} à relancer
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Créées automatiquement quand vous cliquez « Postuler », ou ajoutées à la main pour une
        candidature faite ailleurs.
      </p>

      <ApplicationBoard items={items} />
    </section>
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/mon-espace/export — « Télécharger mes données » (spec §45-46,
 * RGPD). Toutes les données appartenant au candidat, en JSON, aucune donnée
 * d'un autre utilisateur (ex. les offres elles-mêmes ne sont pas incluses,
 * seulement le lien du candidat à ces offres — l'offre est une donnée
 * publique, pas une donnée personnelle du candidat).
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, savedOffers, hiddenOffers, savedSearches, applications, applyClicks] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          school: true,
          graduationYear: true,
          headline: true,
          city: true,
          educationLevel: true,
          targetSpecialty: true,
          cvFilename: true,
          cvUploadedAt: true,
          createdAt: true,
        },
      }),
      prisma.savedOffer.findMany({
        where: { userId },
        select: { offerId: true, createdAt: true },
      }),
      prisma.hiddenOffer.findMany({
        where: { userId },
        select: { offerId: true, createdAt: true },
      }),
      prisma.savedSearch.findMany({
        where: { userId },
        select: { name: true, params: true, frequency: true, createdAt: true },
      }),
      prisma.application.findMany({
        where: { userId },
        select: {
          companyName: true,
          jobTitle: true,
          sourceUrl: true,
          status: true,
          notes: true,
          appliedAt: true,
          createdAt: true,
          history: { select: { status: true, changedAt: true } },
        },
      }),
      prisma.applyClick.findMany({
        where: { userId },
        select: { offerId: true, clickedAt: true },
      }),
    ]);

  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    importedProfiles: (await prisma.siteSetting.findUnique({ where: { key: "importedPersonalProfiles" } }))?.value ?? [],
    savedOffers,
    hiddenOffers,
    savedSearches,
    applications,
    applyClicks,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="jobly-donnees-${userId}.json"`,
    },
  });
}

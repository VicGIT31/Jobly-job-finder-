import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST /api/offres/:offerId/sauvegarde — sauvegarde une offre. */
export async function POST(
  _request: NextRequest,
  { params: pendingParams }: { params: Promise<{ offerId: string }> },
): Promise<NextResponse> {
  const params = await pendingParams;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const offer = await prisma.jobOffer.findUnique({ where: { id: params.offerId } });
  if (!offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  await prisma.savedOffer.upsert({
    where: { userId_offerId: { userId: session.user.id, offerId: params.offerId } },
    update: {},
    create: { userId: session.user.id, offerId: params.offerId },
  });

  return NextResponse.json({ saved: true }, { status: 201 });
}

/** DELETE /api/offres/:offerId/sauvegarde — retire une offre sauvegardée. */
export async function DELETE(
  _request: NextRequest,
  { params: pendingParams }: { params: Promise<{ offerId: string }> },
): Promise<NextResponse> {
  const params = await pendingParams;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  await prisma.savedOffer.deleteMany({
    where: { userId: session.user.id, offerId: params.offerId },
  });

  return NextResponse.json({ saved: false });
}

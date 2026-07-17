import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** GET /api/cv — redirige vers une URL signée du CV de l'utilisateur connecté. */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvKey: true },
  });
  if (!user?.cvKey) {
    return NextResponse.json({ error: "Aucun CV" }, { status: 404 });
  }

  const url = await getStorage().getSignedUrl(user.cvKey, 300);
  return NextResponse.redirect(url, 302);
}

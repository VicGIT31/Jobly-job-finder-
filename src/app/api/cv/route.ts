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
    select: { cvKey: true, cvFilename: true },
  });
  if (!user?.cvKey) {
    return NextResponse.json({ error: "Aucun CV" }, { status: 404 });
  }

  const storage = getStorage();
  if (storage.read) {
    try {
      const body = await storage.read(user.cvKey);
      return new NextResponse(new Uint8Array(body), { headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(user.cvFilename ?? "CV.pdf")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      } });
    } catch { return NextResponse.json({ error: "Le fichier CV est introuvable. Importez-le à nouveau." }, { status: 404 }); }
  }
  const url = await storage.getSignedUrl(user.cvKey, 300);
  return NextResponse.redirect(url, 302);
}

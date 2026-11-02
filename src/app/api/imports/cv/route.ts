import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { getPersonalProfile } from "@/server/personal/profile";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  await getPersonalProfile();
  const setting = await prisma.siteSetting.findUnique({ where: { key: "importedPersonalProfiles" } });
  const profile = (Array.isArray(setting?.value) ? setting.value : []).find((row) => row && typeof row === "object" && !Array.isArray(row) && row.id === request.nextUrl.searchParams.get("id"));
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || typeof profile.cvKey !== "string") return NextResponse.json({ error: "Aucun CV archivé pour ce profil." }, { status: 404 });
  const storage = getStorage();
  try { if (storage.read) { const body = await storage.read(profile.cvKey); return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } }); } return NextResponse.redirect(await storage.getSignedUrl(profile.cvKey, 300)); }
  catch { return NextResponse.json({ error: "Le fichier n’était pas présent dans la sauvegarde importée. Retrouvez le PDF d’origine pour le réimporter depuis Profil & CV." }, { status: 404 }); }
}

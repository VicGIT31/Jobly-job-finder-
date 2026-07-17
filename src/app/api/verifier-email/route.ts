import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/verifier-email?token=…&email=… — confirme l'adresse email. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const email = (request.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  const origin = request.nextUrl.origin;

  if (!token || !email) {
    return NextResponse.redirect(new URL("/connexion?verification=erreur", origin));
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier !== `verify:${email}` || record.expires < new Date()) {
    return NextResponse.redirect(new URL("/connexion?verification=erreur", origin));
  }

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.redirect(new URL("/connexion?verification=ok", origin));
}

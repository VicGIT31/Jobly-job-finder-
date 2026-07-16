import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { resolveApply } from "@/server/apply/redirect";

export const dynamic = "force-dynamic";

/**
 * GET /go/:offerId — le bouton « Postuler ».
 * 302 vers la source, clic loggé dans apply_clicks. Jamais de formulaire interne.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { offerId: string } },
): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const { allowed } = await rateLimit(`go:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const session = await auth();

  const resolution = await resolveApply(
    {
      findOffer: (offerId) =>
        prisma.jobOffer.findUnique({
          where: { id: offerId },
          select: { id: true, slug: true, status: true, sourceUrl: true },
        }),
      recordClick: async (data) => {
        await prisma.applyClick.create({ data });
      },
    },
    params.offerId,
    session?.user?.id ?? null,
    request.headers.get("referer"),
  );

  switch (resolution.kind) {
    case "redirect":
      return NextResponse.redirect(resolution.url, 302);
    case "expired":
      return NextResponse.redirect(
        new URL(`/offres/${resolution.slug}/expiree`, request.nextUrl.origin),
        302,
      );
    case "not_found":
      return NextResponse.redirect(new URL("/offre-introuvable", request.nextUrl.origin), 302);
  }
}

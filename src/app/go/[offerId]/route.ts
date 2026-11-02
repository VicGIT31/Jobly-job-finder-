import { localAppUrl } from "@/lib/local-url";
import { STUDENT_OFFER_WHERE } from "@/server/offers/public-scope";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { resolveApply } from "@/server/apply/redirect";
import { syncApplicationOnApply } from "@/server/applications/tracker";

export const dynamic = "force-dynamic";

/**
 * GET /go/:offerId — le bouton « Postuler ».
 * 302 vers la source, clic loggé dans apply_clicks. Jamais de formulaire interne.
 */
export async function GET(
  request: NextRequest,
  { params: pendingParams }: { params: Promise<{ offerId: string }> },
): Promise<NextResponse> {
  const params = await pendingParams;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const { allowed } = await rateLimit(`go:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const session = await auth();

  const offer = await prisma.jobOffer.findFirst({
    where: { id: params.offerId, ...STUDENT_OFFER_WHERE },
    select: {
      id: true,
      slug: true,
      status: true,
      sourceUrl: true,
      title: true,
      company: { select: { name: true, logoUrl: true } },
    },
  });

  const resolution = await resolveApply(
    {
      findOffer: async () => offer,
      recordClick: async (data) => {
        await prisma.applyClick.create({ data });
      },
    },
    params.offerId,
    session?.user?.id ?? null,
    request.headers.get("referer"),
  );

  // Suivi automatique de candidature : best-effort, ne doit jamais bloquer la
  // redirection réelle vers la source si ça échoue.
  if (resolution.kind === "redirect" && session?.user?.id && offer) {
    try {
      await syncApplicationOnApply(session.user.id, {
        id: offer.id,
        title: offer.title,
        sourceUrl: offer.sourceUrl,
        companyName: offer.company.name,
        companyLogoUrl: offer.company.logoUrl,
      });
    } catch (err) {
      console.error("syncApplicationOnApply a échoué", err);
    }
  }

  switch (resolution.kind) {
    case "redirect":
      return NextResponse.redirect(resolution.url, 302);
    case "expired":
      return NextResponse.redirect(
        localAppUrl(`/offres/${resolution.slug}/expiree`, request.nextUrl.origin),
        302,
      );
    case "not_found":
      return NextResponse.redirect(localAppUrl("/offre-introuvable", request.nextUrl.origin), 302);
  }
}

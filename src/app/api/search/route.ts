import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchOffers } from "@/server/search/query";
import { excludeHiddenOffers } from "@/server/offers/hidden-filter";
import { parseOfferSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

/** GET /api/search — recherche instantanée côté client (mêmes params que /offres). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const input = parseOfferSearchParams(params);
  const result = await searchOffers(input);

  const session = await auth();
  if (session?.user?.id) {
    const hidden = await prisma.hiddenOffer.findMany({
      where: { userId: session.user.id },
      select: { offerId: true },
    });
    if (hidden.length > 0) {
      result.hits = excludeHiddenOffers(result.hits, new Set(hidden.map((h) => h.offerId)));
    }
  }

  return NextResponse.json(result);
}

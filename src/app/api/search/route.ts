import { NextRequest, NextResponse } from "next/server";
import { searchOffers } from "@/server/search/query";
import { parseOfferSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

/** GET /api/search — recherche instantanée côté client (mêmes params que /offres). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const input = parseOfferSearchParams(params);
  const result = await searchOffers(input);
  return NextResponse.json(result);
}

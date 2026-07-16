import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/villes?q=ly — autocomplétion des villes présentes en base. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const cities = await prisma.jobOffer.groupBy({
    by: ["city"],
    where: {
      status: "ACTIVE",
      ...(q ? { city: { startsWith: q, mode: "insensitive" } } : {}),
    },
    _count: true,
    orderBy: { _count: { city: "desc" } },
    take: 8,
  });

  return NextResponse.json(
    cities.map((c) => ({ city: c.city, count: c._count })),
  );
}

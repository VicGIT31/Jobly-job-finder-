import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOfferSearchParams, CONTRACT_LABELS } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  queryString: z.string().max(1000),
  name: z.string().min(1).max(120).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "NEVER"]).optional(),
});

/** POST /api/alertes — crée une recherche sauvegardée depuis une URL de recherche. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const input = parseOfferSearchParams(
    Object.fromEntries(new URLSearchParams(parsed.data.queryString).entries()),
  );

  // Params persistés au format SearchParams (cf. alerts/match.ts)
  const params = {
    q: input.q || undefined,
    city: input.ville || undefined,
    contractType: input.contrat.length ? input.contrat : undefined,
    remotePolicy: input.remote.length ? input.remote : undefined,
    educationLevel: input.niveau.length ? input.niveau : undefined,
    sector: input.secteur.length ? input.secteur : undefined,
  };

  const autoName =
    [
      input.q,
      input.contrat.map((c) => CONTRACT_LABELS[c as keyof typeof CONTRACT_LABELS]).join("/"),
      input.ville,
    ]
      .filter(Boolean)
      .join(" · ") || "Toutes les offres";

  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name ?? autoName,
      params,
      frequency: parsed.data.frequency ?? "DAILY",
    },
  });

  return NextResponse.json(search, { status: 201 });
}

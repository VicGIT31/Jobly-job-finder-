import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assistantSchema, assistantStatus, availableAssistants, saveAssistantConfig } from "@/server/ingest/assistant-config";
import { finishWelcome, getWelcome, saveWelcomeName } from "@/server/personal/welcome";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await assistantStatus(), { headers: { "Cache-Control": "private, no-store" } });
}

const name = z.string().trim().min(1).max(60).regex(/\p{L}/u);

export async function POST(request: NextRequest) {
  const expected = process.env.JOBLY_LOCAL_ORIGIN ?? request.nextUrl.origin;
  if (request.headers.get("origin") !== expected || !request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "Requête locale requise." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.stage === "profile") {
    const parsed = z.object({ firstName: name, lastName: name }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Saisissez votre prénom et votre nom." }, { status: 400 });
    await saveWelcomeName(parsed.data.firstName, parsed.data.lastName);
    return NextResponse.json({ ok: true });
  }
  const parsed = assistantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choisissez un modèle et un budget valides." }, { status: 400 });
  if (parsed.data.provider !== "local" && !availableAssistants().includes(parsed.data.provider))
    return NextResponse.json({ error: "Ce fournisseur n’est pas disponible dans cette édition." }, { status: 400 });
  if (body?.welcome === true) {
    const profile = await getWelcome();
    if (!profile.firstName || !profile.lastName) return NextResponse.json({ error: "Identifiez d’abord votre profil." }, { status: 400 });
  }
  await saveAssistantConfig(parsed.data);
  if (body?.welcome === true) await finishWelcome();
  return GET();
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ingestPayloadSchema } from "@/server/ingest/normalize";
import { processIngest } from "@/server/ingest/ingest";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isValidApiKey(provided: string | null): boolean {
  const expected = process.env.INGEST_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /internal/ingest — réception d'offres brutes depuis les scrapers.
 * Protégée par clé API (header x-api-key) + rate limiting.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isValidApiKey(request.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const { allowed } = await rateLimit("ingest", 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = ingestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const summary = await processIngest(parsed.data.sourceSite, parsed.data.offers);
  return NextResponse.json(summary, { status: 200 });
}

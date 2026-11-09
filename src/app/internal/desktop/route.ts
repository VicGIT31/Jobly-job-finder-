import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { saveSearchArea } from "@/server/personal/search-area";
import { getPersonalProfile, resetPersonalProfile } from "@/server/personal/profile";
import { getSourceEntries } from "@/server/ingest/sources";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { runIngestion, IngestionAlreadyRunningError } from "@/server/ingest/run-ingestion";
import { expireStaleOffers } from "@/server/ingest/freshness";
import { sendDailyAlerts } from "@/server/alerts/send";
import { reconcileSearchIndex } from "@/server/search/reconcile";
import { getIngestionProgress } from "@/server/ingest/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const state = globalThis as typeof globalThis & { desktopCollecting?: boolean; desktopError?: string; desktopAbort?: AbortController };

function authorized(request: NextRequest) {
  const expected = process.env.JOBLY_DESKTOP_TOKEN;
  const value = request.headers.get("x-jobly-desktop-token");
  return process.env.JOBLY_DESKTOP === "1" && expected && value && expected.length === value.length && timingSafeEqual(Buffer.from(expected), Buffer.from(value));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  await getPersonalProfile();
  const [offers, runs, settings] = await Promise.all([
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.ingestRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    getSettings("ingestion"),
  ]);
  const mailDir = process.env.JOBLY_MAIL_DIR!;
  const names = await readdir(mailDir).catch(() => [] as string[]);
  const messages = await Promise.all(names.filter((name) => name.endsWith(".json")).sort().reverse().slice(0, 30).map(async (name) => {
    try { const mail = JSON.parse(await readFile(join(mailDir, name), "utf8")); return { to: mail.to, subject: mail.subject, text: mail.text, at: mail.at }; }
    catch { return null; }
  }));
  const sources = (await getSourceEntries()).map(({ id, connector }) => ({ id, label: connector.label, group: connector.group ?? "TECH" }));
  const selected = await prisma.siteSetting.findUnique({ where: { key: "desktopSources" } });
  return NextResponse.json({ ready: true, configured: true, offers, runs, settings, sources, progress: getIngestionProgress(), selectedSources: selected?.value ?? [], collecting: !!state.desktopCollecting, error: state.desktopError ?? null, messages: messages.filter(Boolean) });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  const body = await request.json().catch(() => null);
  if (body?.action === "collect") {
    if (state.desktopCollecting) return NextResponse.json({ ok: true, collecting: true });
    if (typeof body.city === "string" && body.city.trim()) { try { await saveSearchArea(body.city); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ville non reconnue" }, { status: 400 }); } }
    if (!(await getSettings("ingestion")).ingestionEnabled && !body.manual) return NextResponse.json({ ok: true, paused: true });
    state.desktopCollecting = true;
    state.desktopError = undefined;
    state.desktopAbort = new AbortController();
    void runIngestion({ signal: state.desktopAbort.signal }).catch((error) => {
      if (!(error instanceof IngestionAlreadyRunningError)) state.desktopError = error instanceof Error ? error.message : "Collecte interrompue";
    }).finally(() => { state.desktopCollecting = false; });
    return NextResponse.json({ ok: true, collecting: true });
  }
  if (body?.action === "cancel") {
    state.desktopAbort?.abort();
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "sources") {
    if (state.desktopCollecting) return NextResponse.json({ error: "Attendez la fin de la collecte avant de changer les sources." }, { status: 409 });
    const parsed = z.array(z.string().max(120)).max(5000).safeParse(body.ids);
    if (!parsed.success) return NextResponse.json({ error: "Sélection de sources invalide." }, { status: 400 });
    const ids = new Set((await getSourceEntries()).map(({ id }) => id));
    if (parsed.data.some((id) => !ids.has(id))) return NextResponse.json({ error: "Une source n’existe plus dans le catalogue." }, { status: 400 });
    await prisma.siteSetting.upsert({ where: { key: "desktopSources" }, create: { key: "desktopSources", value: parsed.data }, update: { value: parsed.data } });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "maintenance") {
    await expireStaleOffers();
    await sendDailyAlerts();
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "index") { resetPersonalProfile(); await getPersonalProfile(); return NextResponse.json({ ok: true, ...await reconcileSearchIndex() }); }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

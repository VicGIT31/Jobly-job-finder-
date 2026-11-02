import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fold } from "@/lib/job-taxonomy";
import { fetchJson } from "@/server/ingest/http";
import communes from "../../../config/communes-haute-garonne.json";
const areaSchema = z.object({ city: z.string().min(1).max(120), code: z.string().regex(/^\d[\dAB]\d{3}$/i), postcode: z.string().regex(/^\d{5}$/).optional() });
export type SearchArea = z.infer<typeof areaSchema>;
export async function getSearchArea(): Promise<SearchArea | undefined> { const row = await prisma.siteSetting.findUnique({ where: { key: "personalSearchArea" } }); const parsed = areaSchema.safeParse(row?.value); return parsed.success ? parsed.data : undefined; }
export async function saveSearchArea(city: string) {
  const name = city.trim().slice(0, 120);
  const local = communes.find((row) => fold(row.nom) === fold(name));
  const data = local ? [{ nom: local.nom, code: local.code, codesPostaux: local.codesPostaux }] : await fetchJson<Array<{ nom: string; code: string; codesPostaux?: string[] }>>(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(name)}&fields=nom,code,codesPostaux&limit=5`, { timeoutMs: 3500, retries: 0, cacheTtlMs: 30 * 86400000 });
  const exact = data?.filter((row) => fold(row.nom) === fold(name));
  if (!exact?.length || exact.length !== 1) throw new Error("Commune introuvable ou ambiguë. Précisez son nom officiel pour actualiser cette zone. Le catalogue déjà collecté reste consultable.");
  const area = areaSchema.parse({ city: exact[0].nom, code: exact[0].code, postcode: exact[0].codesPostaux?.[0] });
  await prisma.siteSetting.upsert({ where: { key: "personalSearchArea" }, create: { key: "personalSearchArea", value: area }, update: { value: area } });
  return area;
}

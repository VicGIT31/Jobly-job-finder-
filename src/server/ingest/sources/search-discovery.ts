import { readFile, mkdir, writeFile, open, unlink, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { z } from "zod";
import { fetchJson } from "../http";
import { publicHttpUrl } from "../public-network";

export const searchConfigSchema = z.object({
  provider: z.literal("tavily"),
  apiKey: z.string().trim().min(12).max(300).nullable().optional(),
  dailyLimit: z.number().int().min(1).max(30).default(20),
  monthlyLimit: z.number().int().min(1).max(900).default(600),
});
export const searchConfigPath = () => process.env.JOBLY_DISCOVERY_CONFIG ?? (process.env.JOBLY_FILES_DIR
  ? join(dirname(process.env.JOBLY_FILES_DIR), "search-api.json")
  : join(process.cwd(), ".cache", "jobly", "search-api.json"));

async function config() {
  if (process.env.JOBLY_SEARCH_DISCOVERY === "0") return null;
  if (process.env.TAVILY_API_KEY) return searchConfigSchema.safeParse({ provider: "tavily", apiKey: process.env.TAVILY_API_KEY }).data ?? null;
  try {
    const raw = JSON.parse(await readFile(searchConfigPath(), "utf8"));
    if (raw?.enabled === false) return null;
    return searchConfigSchema.safeParse(raw).data ?? null;
  }
  catch (error) {
    // Official free keyless mode, not an API key borrowed from a third party.
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? { provider: "tavily" as const, apiKey: null, dailyLimit: 10, monthlyLimit: 300 } : null;
  }
}
const ledgerSchema = z.object({ day: z.string(), month: z.string(), daily: z.number().int().nonnegative(), monthly: z.number().int().nonnegative(), cursor: z.number().int().nonnegative(), blockedUntil: z.number().default(0) });
const QUERIES = [
  'stage intelligence artificielle France site carrière recrutement',
  'machine learning internship France employer careers',
  'stage LLM NLP France laboratoire offre',
  'stage vision ordinateur apprentissage France laboratoire',
  'stage IA embarquée France recrutement entreprise',
  'stage recherche intelligence artificielle France master',
  'site:jobs.ashbyhq.com France internship AI',
  'site:apply.workable.com France machine learning intern',
  'site:jobs.lever.co France AI internship',
  'stage apprentissage profond France site entreprise',
];
const ledgerPath = () => join(process.env.INGEST_CACHE_DIR ?? join(process.cwd(), ".cache", "jobly"), "search-discovery", "usage.json");

/** Optional C: at most two basic searches/cycle, charged before each attempt.
 * A failed provider never prevents the autonomous no-key crawl.
 */
export async function searchDiscoverySeeds(): Promise<{ seeds: Array<{ url: string; label: string }>; warnings: string[] }> {
  const result: { seeds: Array<{ url: string; label: string }>; warnings: string[] } = { seeds: [], warnings: [] };
  const settings = await config();
  if (!settings) return result;
  const path = ledgerPath(), lockPath = `${path}.lock`;
  await mkdir(dirname(path), { recursive: true });
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch {
    // Requests have a 12 s deadline. A ten-minute lock belongs to an interrupted process.
    try {
      if (Date.now() - (await stat(lockPath)).mtimeMs <= 10 * 60000) throw new Error("busy");
      await unlink(lockPath); lock = await open(lockPath, "wx", 0o600);
    } catch { result.warnings.push("Découverte API déjà occupée ; collecte sans clé conservée"); return result; }
  }
  try {
    const day = new Date().toISOString().slice(0, 10), month = day.slice(0, 7);
    let usage = { day, month, daily: 0, monthly: 0, cursor: 0, blockedUntil: 0 };
    try { usage = ledgerSchema.parse(JSON.parse(await readFile(path, "utf8"))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") { result.warnings.push("Compteur API illisible ; appels suspendus pour préserver le quota"); return result; }
    }
    if (usage.month !== month) { usage.month = month; usage.monthly = 0; }
    if (usage.day !== day) { usage.day = day; usage.daily = 0; }
    for (let n = 0; n < 2; n++) {
      if (Date.now() < usage.blockedUntil || usage.daily >= settings.dailyLimit || usage.monthly >= settings.monthlyLimit) break;
      const query = QUERIES[usage.cursor % QUERIES.length];
      usage.cursor++; usage.daily++; usage.monthly++;
      await writeFile(path, JSON.stringify(usage), { mode: 0o600 });
      const response = await fetchJson<{ results?: Array<{ url?: string }> }>("https://api.tavily.com/search", {
        method: "POST", publicOnly: true, retries: 0, timeoutMs: 12000, minIntervalMs: 1000,
        headers: { ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : { "X-Tavily-Access-Mode": "keyless" }), "Content-Type": "application/json" },
        body: JSON.stringify({ query, search_depth: "basic", max_results: 8, include_answer: false, include_raw_content: false, auto_parameters: false }),
      });
      if (!response || !Array.isArray(response.results)) {
        usage.blockedUntil = Date.now() + 24 * 3600000;
        await writeFile(path, JSON.stringify(usage), { mode: 0o600 });
        result.warnings.push("API de découverte indisponible ou quota refusé ; pause 24 h, collecte sans clé conservée");
        break;
      }
      for (const item of response.results) {
        const url = item.url ? publicHttpUrl(item.url) : null;
        if (url && !/(^|\.)(?:linkedin\.com|indeed\.com|facebook\.com|google\.com)$/.test(url.hostname)) result.seeds.push({ url: url.href, label: url.hostname.replace(/^www\./, "") });
      }
    }
  } catch { result.warnings.push("Découverte API interrompue ; collecte sans clé conservée"); }
  finally { await lock.close(); await unlink(lockPath).catch(() => undefined); }
  return result;
}

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { MODEL_ASSISTANTS } from "@/lib/collection-assistant";
import { prisma } from "@/lib/prisma";

export const assistantSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("local"), model: z.literal("").default(""), dailyCalls: z.number().int().min(1).max(30) }),
  z.object({ provider: z.enum(MODEL_ASSISTANTS), model: z.string().trim().regex(/^[a-zA-Z0-9._:/-]+$/).max(120), dailyCalls: z.number().int().min(1).max(30) }),
]);

export function availableAssistants() {
  const configured = process.env.JOBLY_ASSISTANTS?.split(",") ?? [];
  return MODEL_ASSISTANTS.filter((provider) => configured.includes(provider));
}

type Config = z.infer<typeof assistantSchema>;
const filename = () => resolve(process.env.JOBLY_ASSISTANT_DIR ?? process.env.INGEST_CACHE_DIR ?? ".cache/jobly", "collection-assistant.json");
export async function readAssistantConfig(): Promise<Config> {
  try {
    const config = assistantSchema.parse(JSON.parse(await readFile(filename(), "utf8")));
    if (config.provider === "local" || availableAssistants().includes(config.provider)) return config;
  }
  catch { /* Missing or incompatible configuration uses the shipped defaults. */ }
  return { provider: "local", model: "", dailyCalls: 6 };
}

export async function saveAssistantConfig(data: Config) {
  const file = filename();
  const staging = file + "." + randomUUID();
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  try {
    await writeFile(staging, JSON.stringify(data), { mode: 0o600, flag: "wx" });
    await rename(staging, file);
  } finally { await unlink(staging).catch(() => undefined); }
}

const DAY_SETTING = "collectionAssistantDailyUsage";
const utcDay = () => new Date().toISOString().slice(0, 10);
function usage(value: unknown, day: string): number {
  if (!value || typeof value !== "object" || !("day" in value) || value.day !== day || !("count" in value)) return 0;
  return typeof value.count === "number" ? value.count : 0;
}

export async function assistantStatus() {
  const [config, row] = await Promise.all([
    readAssistantConfig(), prisma.siteSetting.findUnique({ where: { key: DAY_SETTING } }),
  ]);
  return { provider: config.provider, dailyCalls: config.dailyCalls, model: config.model,
    callsToday: usage(row?.value, utcDay()) };
}

/** Persist the reservation before sending anything, including failed provider calls. */
export async function reserveAssistantCall(limit: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(604010)`;
    const day = utcDay();
    const row = await tx.siteSetting.findUnique({ where: { key: DAY_SETTING } });
    const count = usage(row?.value, day);
    if (count >= limit) return false;
    const value = { day, count: count + 1 };
    await tx.siteSetting.upsert({ where: { key: DAY_SETTING }, create: { key: DAY_SETTING, value }, update: { value } });
    return true;
  });
}

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { publicHttpUrl } from "../public-network";
import { sourceDefinitionSchema, type SourceDefinition } from "./catalog";

export const discoveryStateSchema = z.object({
  version: z.literal(1),
  directoryOffset: z.number().int().nonnegative().default(0),
  directoryAt: z.number().nonnegative().default(0),
  osmCursor: z.number().int().nonnegative().default(0),
  osmType: z.enum(["node", "way", "relation"]).default("node"),
  frontier: z
    .array(
      z.object({
        url: z.string().url(),
        label: z.string().max(200),
        depth: z.number().int().min(0).max(3),
        listingUrl: z.string().url().optional(),
        nextAt: z.number().nonnegative(),
        failures: z.number().int().nonnegative(),
      }),
    )
    .max(10000),
  sources: z
    .array(
      z.object({
        definition: sourceDefinitionSchema,
        evidence: z.string().url(),
        verifiedAt: z.number(),
      }),
    )
    .max(2000),
});
export type DiscoveryState = z.infer<typeof discoveryStateSchema>;
export const emptyDiscoveryState = (): DiscoveryState => ({
  version: 1,
  directoryOffset: 0,
  directoryAt: 0,
  osmCursor: 0,
  osmType: "node",
  frontier: [],
  sources: [],
});
export const discoveryStatePath = () =>
  process.env.JOB_DISCOVERY_FILE ??
  join(
    process.env.INGEST_CACHE_DIR ?? join(process.cwd(), ".cache", "jobly"),
    "discovery",
    "state.json",
  );
export async function readDiscoveryState(): Promise<DiscoveryState> {
  try {
    return discoveryStateSchema.parse(JSON.parse(await readFile(discoveryStatePath(), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new Error(
        "État de découverte illisible ; conservé sur disque, restauration nécessaire",
        { cause: error },
      );
    return emptyDiscoveryState();
  }
}
export async function saveDiscoveryState(state: DiscoveryState): Promise<void> {
  const path = discoveryStatePath();
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(discoveryStateSchema.parse(state)), { mode: 0o600 });
  await rename(temporary, path);
}
export function enqueueDiscovery(
  state: DiscoveryState,
  value: string,
  label: string,
  depth = 0,
  listingUrl?: string,
): boolean {
  const url = publicHttpUrl(value);
  if (
    !url ||
    depth > 3 ||
    state.frontier.some((entry) => entry.url === url.href) ||
    state.frontier.length >= 10000
  )
    return false;
  state.frontier.push({
    url: url.href,
    label: label.slice(0, 200),
    depth,
    listingUrl,
    nextAt: 0,
    failures: 0,
  });
  return true;
}
export function discoveryId(url: string): string {
  return `auto-${createHash("sha256").update(url).digest("hex").slice(0, 20)}`;
}
const observed = new Map<string, string>();
export function observeEmployerWebsite(value: string, label: string): void {
  const url = publicHttpUrl(value);
  if (url && observed.size < 2000) observed.set(url.href, label);
}
export function drainObservedEmployers(): Array<[string, string]> {
  const entries = [...observed];
  observed.clear();
  return entries;
}
export async function discoveredDefinitions(): Promise<SourceDefinition[]> {
  return (await readDiscoveryState()).sources
    .filter((source) => Date.now() - source.verifiedAt < 30 * 86400000)
    .map(({ definition }) => definition);
}

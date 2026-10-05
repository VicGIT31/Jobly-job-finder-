import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const MAX_BODY_BYTES = 8_000_000;
const MAX_FILES = 5_000;
const directory = () => process.env.INGEST_CACHE_DIR ?? join(process.cwd(), ".cache", "jobly");
const filename = (key: string) =>
  join(directory(), `${createHash("sha256").update(key).digest("hex")}.json`);
let writes = 0;

/** Aucun fallback périmé : une annonce non vérifiée ne reste pas active grâce au cache. */
export async function readCachedBody(key: string, ttlMs: number): Promise<string | null> {
  try {
    const entry = JSON.parse(await readFile(filename(key), "utf8")) as { at: number; body: string };
    return typeof entry.body === "string" && Date.now() - entry.at < ttlMs ? entry.body : null;
  } catch {
    return null;
  }
}

export async function writeCachedBody(key: string, body: string): Promise<void> {
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) return;
  const destination = filename(key);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await mkdir(directory(), { recursive: true });
    await writeFile(temporary, JSON.stringify({ at: Date.now(), body }), { mode: 0o600 });
    await rename(temporary, destination);
    if (++writes % 100 === 0) await prune();
  } catch {
    await unlink(temporary).catch(() => undefined);
    // Cache optionnel : filesystem en lecture seule = collecte toujours possible.
  }
}

async function prune(): Promise<void> {
  const files = (await readdir(directory())).filter((name) => name.endsWith(".json"));
  if (files.length <= MAX_FILES) return;
  const entries = await Promise.all(
    files.map(async (name) => ({ name, at: (await stat(join(directory(), name))).mtimeMs })),
  );
  entries.sort((a, b) => a.at - b.at);
  await Promise.all(
    entries
      .slice(0, entries.length - MAX_FILES)
      .map(({ name }) => unlink(join(directory(), name)).catch(() => undefined)),
  );
}

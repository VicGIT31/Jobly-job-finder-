import { gzipSync, gunzipSync } from "node:zlib";
import { readFile, readdir, mkdir, writeFile, stat, rename, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { Client } from "pg";

export const TABLES = ["companies", "users", "accounts", "sessions", "verification_tokens", "job_offers", "saved_offers", "hidden_offers", "saved_searches", "apply_clicks", "applications", "application_status_history", "site_settings", "audit_logs", "ingest_runs", "ingest_logs", "offer_origins", "offer_locations"] as const;
type Backup = { format: "jobly-backup"; version: 1; createdAt: string; tables: Record<string, unknown[]>; files: Record<string, string> };
async function filesFrom(root: string, relative = ""): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(join(root, relative), { withFileTypes: true }).catch(() => [])) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) Object.assign(files, await filesFrom(root, name));
    else if (entry.isFile()) files[name] = (await readFile(join(root, name))).toString("base64");
  }
  return files;
}
export async function createBackup(client: Client, filesRoot: string, destination: string) {
  const tables: Record<string, unknown[]> = {};
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    for (const name of TABLES) { const exists = await client.query("SELECT to_regclass($1) AS name", [name]); if (!exists.rows[0].name) { tables[name] = []; continue; } const result = await client.query(`SELECT coalesce(json_agg(t), '[]') AS rows FROM "${name}" t`); tables[name] = result.rows[0].rows; }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  const backup: Backup = { format: "jobly-backup", version: 1, createdAt: new Date().toISOString(), tables, files: await filesFrom(filesRoot) };
  await writeFile(`${destination}.tmp`, gzipSync(JSON.stringify(backup)), { mode: 0o600 });
  await rename(`${destination}.tmp`, destination);
}
export async function restoreBackup(client: Client, filesRoot: string, source: string) {
  if ((await stat(source)).size > 512 * 1024 * 1024) throw new Error("Sauvegarde trop volumineuse (512 Mo maximum).");
  const backup = JSON.parse(gunzipSync(await readFile(source), { maxOutputLength: 1024 * 1024 * 1024 }).toString("utf8")) as Backup;
  if (backup.format !== "jobly-backup" || backup.version !== 1 || !backup.tables || !backup.files || TABLES.some((name) => !["offer_origins", "offer_locations"].includes(name) && !Array.isArray(backup.tables[name]))) throw new Error("Ce fichier n’est pas une sauvegarde Jobly compatible.");
  const staging = `${filesRoot}.restore`;
  await rm(staging, { recursive: true, force: true }); await mkdir(staging, { recursive: true });
  for (const [key, value] of Object.entries(backup.files)) {
    if (typeof value !== "string") throw new Error("Fichier de sauvegarde invalide.");
    const path = resolve(staging, key);
    if (!path.startsWith(resolve(staging) + sep)) throw new Error("Chemin de sauvegarde invalide.");
    await mkdir(resolve(path, ".."), { recursive: true }); await writeFile(path, Buffer.from(value, "base64"), { mode: 0o600 });
  }
  await client.query("BEGIN");
  let previousFiles = false;
  let swapped = false;
  try {
    await client.query(`TRUNCATE ${TABLES.map((name) => `"${name}"`).join(",")} CASCADE`);
    for (const name of TABLES) if (backup.tables[name]?.length) {
      // Old archives lack new columns: let PostgreSQL apply their defaults.
      const available = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [name]);
      const first = backup.tables[name][0] as Record<string, unknown>;
      const columns = available.rows.map((row) => row.column_name as string).filter((key) => Object.hasOwn(first, key));
      const list = columns.map((key) => `"${key}"`).join(",");
      await client.query(`INSERT INTO "${name}" (${list}) SELECT ${list} FROM json_populate_recordset(NULL::"${name}", $1::json)`, [JSON.stringify(backup.tables[name])]);
    }
    // Stage files before changing the live directory; keep old files for recovery.
    await rm(`${filesRoot}.previous`, { recursive: true, force: true });
    await rename(filesRoot, `${filesRoot}.previous`).then(() => { previousFiles = true; }).catch((e) => { if (e.code !== "ENOENT") throw e; });
    await rename(staging, filesRoot);
    swapped = true;
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (swapped) await rm(filesRoot, { recursive: true, force: true });
    if (previousFiles) await rename(`${filesRoot}.previous`, filesRoot);
    throw e;
  }
}

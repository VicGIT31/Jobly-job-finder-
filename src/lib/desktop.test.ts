import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import type { Client } from "pg";
import { DesktopCoordinator } from "./desktop-coordinator";
import { LocalFileStorage } from "./storage";
import { restoreBackup, TABLES } from "../../desktop/backup";

const roots: string[] = [];
async function temporary() { const path = await mkdtemp(join(tmpdir(), "jobly-desktop-test-")); roots.push(path); return path; }
afterEach(async () => { vi.useRealTimers(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("coordination des collectes bureau", () => {
  it("empêche une seconde collecte et interdit de libérer le verrou d’un autre propriétaire", async () => {
    const locks = new DesktopCoordinator();
    expect(await locks.set("collect", "owner", "EX", 180, "NX")).toBe("OK");
    expect(await locks.set("collect", "other", "EX", 180, "NX")).toBeNull();
    expect(await locks.eval("redis.call('del')", 1, "collect", "other")).toBe(0);
    expect(await locks.eval("redis.call('del')", 1, "collect", "owner")).toBe(1);
    expect(await locks.set("collect", "other", "EX", 180, "NX")).toBe("OK");
  });
  it("récupère un verrou périmé et applique l’expiration des limites de requêtes", async () => {
    vi.useFakeTimers(); const locks = new DesktopCoordinator();
    await locks.set("collect", "owner", "EX", 1, "NX");
    await locks.incr("rate"); await locks.expire("rate", 1);
    vi.advanceTimersByTime(1001);
    expect(await locks.set("collect", "new", "EX", 10, "NX")).toBe("OK");
    expect(await locks.incr("rate")).toBe(1);
  });
});

describe("fichiers privés et restauration", () => {
  it("conserve les CV et refuse un chemin sortant du dossier privé", async () => {
    const root = await temporary(); const storage = new LocalFileStorage(root);
    await storage.put("cv/user/document.pdf", Buffer.from("%PDF-test"));
    expect((await storage.read("cv/user/document.pdf")).toString()).toBe("%PDF-test");
    await expect(storage.put("../outside.pdf", Buffer.from("test"))).rejects.toThrow("Chemin");
    await storage.delete("cv/user/document.pdf");
    await expect(storage.read("cv/user/document.pdf")).rejects.toThrow();
  });
  it("refuse une archive avec traversée de chemin avant toute modification SQL", async () => {
    const root = await temporary(); const file = join(root, "malicious.jobly"); const query = vi.fn();
    const tables = Object.fromEntries(TABLES.map((table) => [table, []]));
    await writeFile(file, gzipSync(JSON.stringify({ format: "jobly-backup", version: 1, tables, files: { "../outside": "YQ==" } })));
    await expect(restoreBackup({ query } as unknown as Client, join(root, "files"), file)).rejects.toThrow("Chemin");
    expect(query).not.toHaveBeenCalled();
  });
  it("rétablit les anciens CV si la validation de transaction échoue", async () => {
    const root = await temporary(); const files = join(root, "files"); await mkdir(files); await writeFile(join(files, "old.pdf"), "original");
    const file = join(root, "backup.jobly"); const tables = Object.fromEntries(TABLES.map((table) => [table, []]));
    await writeFile(file, gzipSync(JSON.stringify({ format: "jobly-backup", version: 1, tables, files: { "new.pdf": Buffer.from("new").toString("base64") } })));
    const query = vi.fn(async (sql: string) => { if (sql === "COMMIT") throw new Error("disk unavailable"); });
    await expect(restoreBackup({ query } as unknown as Client, files, file)).rejects.toThrow("disk unavailable");
    expect(await readFile(join(files, "old.pdf"), "utf8")).toBe("original");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
});

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:net";
import pg from "pg";

export async function freePort(preferred = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", (error) => preferred ? freePort().then(resolve, reject) : reject(error));
    server.listen(preferred, "127.0.0.1", () => { const address = server.address(); const port = typeof address === "object" && address ? address.port : 0; server.close(() => resolve(port)); });
  });
}

export function execute(file: string, args: string[], log: (line: string) => void, env = process.env) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true, env });
    let output = "";
    child.stdout.on("data", (data) => log(String(data)));
    child.stderr.on("data", (data) => { output += String(data); log(String(data)); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Le composant ${file.split(/[\\/]/).at(-1)} a échoué (${code}). ${output.slice(-1500)}`)));
  });
}

export class LocalDatabase {
  process?: ChildProcess;
  port = 0;
  private running = false;
  constructor(public root: string, private binaries: string, public password: string, private log: (line: string) => void) {}
  binary(name: string) { return join(this.binaries, "bin", name + (process.platform === "win32" ? ".exe" : "")); }
  get url() { return `postgresql://jobly:${this.password}@127.0.0.1:${this.port}/jobly`; }
  client(database = "jobly") { return new pg.Client({ host: "127.0.0.1", port: this.port, user: "jobly", password: this.password, database, connectionTimeoutMillis: 2000 }); }
  async start() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const data = join(this.root, "postgres");
    if (!existsSync(join(data, "PG_VERSION"))) {
      const passwordFile = join(this.root, `.pg-${randomBytes(8).toString("hex")}`);
      await writeFile(passwordFile, this.password, { mode: 0o600 });
      try { await execute(this.binary("initdb"), ["-D", data, "-U", "jobly", "--auth=scram-sha-256", `--pwfile=${passwordFile}`, "--encoding=UTF8", "--locale=C"], this.log); }
      finally { await unlink(passwordFile).catch(() => {}); }
    }
    this.port = await freePort();
    let error: Error | undefined;
    if (process.platform === "win32") {
      // pg_ctl launches PostgreSQL with a restricted Windows token. Directly
      // spawning postgres.exe fails from an elevated parent (including CI).
      await execute(this.binary("pg_ctl"), ["-D", data, "-l", join(this.root, "postgresql.log"), "-o", `-p ${this.port} -h 127.0.0.1`, "-w", "-t", "30", "start"], this.log);
    } else {
      this.process = spawn(this.binary("postgres"), ["-D", data, "-p", String(this.port), "-h", "127.0.0.1", "-k", ""], { windowsHide: true });
      this.process.on("error", (e) => { error = e; });
      this.process.stderr?.on("data", (data) => this.log(String(data)));
      this.process.stdout?.on("data", (data) => this.log(String(data)));
    }
    this.running = true;
    let connected = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (error) throw error;
      if (this.process && this.process.exitCode !== null) throw new Error("La base locale ne démarre pas. Consultez le journal depuis le menu Aide.");
      const client = this.client("postgres");
      try {
        await client.connect();
        const found = await client.query("SELECT 1 FROM pg_database WHERE datname='jobly'");
        if (!found.rowCount) await client.query('CREATE DATABASE "jobly"');
        connected = true; break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
      finally { await client.end().catch(() => {}); }
    }
    if (!connected) throw new Error("La base locale met trop de temps à répondre. Relancez Jobly.");
  }
  async migrate(directory: string) {
    const client = this.client(); await client.connect();
    try {
      await client.query('CREATE TABLE IF NOT EXISTS "_jobly_desktop_migrations" (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
      for (const name of (await readdir(directory)).filter((name) => /^\d+_/.test(name)).sort()) {
        const sql = await readFile(join(directory, name, "migration.sql"), "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const applied = await client.query('SELECT checksum FROM "_jobly_desktop_migrations" WHERE name=$1', [name]);
        if (applied.rowCount) { if (applied.rows[0].checksum !== checksum) throw new Error(`Migration modifiée : ${name}`); continue; }
        await client.query("BEGIN");
        try { await client.query(sql); await client.query('INSERT INTO "_jobly_desktop_migrations" (name,checksum) VALUES ($1,$2)', [name, checksum]); await client.query("COMMIT"); }
        catch (error) { await client.query("ROLLBACK"); throw error; }
      }
    } finally { await client.end(); }
  }
  async stop() {
    if (!this.running) return;
    await execute(this.binary("pg_ctl"), ["-D", join(this.root, "postgres"), "-m", "fast", "-w", "-t", "20", "stop"], this.log);
    this.process = undefined;
    this.running = false;
  }
}

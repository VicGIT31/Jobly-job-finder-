import { app, BrowserWindow, Menu, dialog, ipcMain, shell, session, utilityProcess, nativeImage, type UtilityProcess, type IpcMainInvokeEvent } from "electron";
import { appendFileSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { LocalDatabase, freePort } from "./database";
import { createBackup, restoreBackup } from "./backup";

app.setName("Jobly");
if (process.env.JOBLY_USER_DATA) app.setPath("userData", resolve(process.env.JOBLY_USER_DATA));
const smoke = process.argv.includes("--jobly-smoke");
if (smoke) { app.commandLine.appendSwitch("remote-debugging-port", process.env.JOBLY_DEBUG_PORT ?? "9223"); app.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1"); }
const acquired = app.requestSingleInstanceLock();
if (!acquired) app.quit();

let window: BrowserWindow | undefined;
let database: LocalDatabase | undefined;
let server: UtilityProcess | undefined;
let searchProcess: ChildProcess | undefined;
let origin = "";
let token = "";
let quitting = false;
let ready = false;
let closing = false;
let starting: Promise<void> | undefined;
const redactions = new Set<string>();
const timers: ReturnType<typeof setInterval>[] = [];
const userData = app.getPath("userData");
const resources = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "build", "desktop-resources");
const logFile = join(userData, "jobly.log");
const log = (line: string) => { try { let value = String(line).replace(/\x1b\[[0-9;]*m/g, ""); for (const secret of redactions) value = value.replaceAll(secret, "[local-secret]"); appendFileSync(logFile, `${new Date().toISOString()} ${value}\n`, { mode: 0o600 }); } catch {} };
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escape(text: string) { return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
function loading(message: string) {
  if (!window || window.isDestroyed()) return;
  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Jobly</title><style>body{margin:0;background:#f7f6f2;color:#111113;font:18px system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:540px;padding:40px}b{background:#d6ff3d;border-radius:16px;padding:12px 18px;font-size:32px}h1{margin-top:40px;font-size:38px}p{line-height:1.6;color:#555}</style><main><b>J.</b><h1>Votre prochaine étape.</h1><p role="status">${escape(message)}</p></main></html>`)}`);
}
function isLocal(value: string) { try { return new URL(value).origin === origin; } catch { return false; } }
function external(value: string) { try { const url = new URL(value); if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password && !/^(localhost|127\.|0\.|\[|.*\.local$)/i.test(url.hostname)) return shell.openExternal(url.href); } catch {} return Promise.resolve(); }

async function api(action?: string, data: Record<string, unknown> = {}) {
  if (!origin) throw new Error("Jobly est encore en préparation.");
  const response = await fetch(`${origin}/internal/desktop`, { method: action ? "POST" : "GET", headers: { "x-jobly-desktop-token": token, "Content-Type": "application/json" }, ...(action ? { body: JSON.stringify({ ...data, action }) } : {}), signal: AbortSignal.timeout(action === "index" ? 120000 : action === "maintenance" ? 60000 : 15000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Le service local ne répond pas.");
  return body;
}
function validate(event: IpcMainInvokeEvent) {
  if (event.sender !== window?.webContents || !event.senderFrame || event.senderFrame !== event.sender.mainFrame || !isLocal(event.senderFrame.url)) throw new Error("Cette action n’est pas autorisée.");
}
async function backup(destination: string) {
  if (!database) throw new Error("Base locale indisponible.");
  const client = database.client(); await client.connect();
  try { await createBackup(client, join(userData, "files"), destination); } finally { await client.end(); }
  return destination;
}
async function backupDialog() {
  const result = await dialog.showSaveDialog(window!, { title: "Sauvegarder les données Jobly", defaultPath: `Jobly-${new Date().toISOString().slice(0, 10)}.jobly`, filters: [{ name: "Sauvegarde Jobly", extensions: ["jobly"] }] });
  return result.canceled || !result.filePath ? null : backup(result.filePath);
}
async function restoreDialog() {
  if ((await api()).collecting) throw new Error("Attendez la fin de la collecte avant d’importer.");
  const result = await dialog.showOpenDialog(window!, { title: "Importer une sauvegarde Jobly", properties: ["openFile"], filters: [{ name: "Sauvegarde Jobly", extensions: ["jobly"] }] });
  if (result.canceled) return null;
  const confirmation = await dialog.showMessageBox(window!, { type: "warning", buttons: ["Annuler", "Importer"], defaultId: 0, cancelId: 0, message: "Remplacer les données locales par cette sauvegarde ?", detail: "Une copie de sécurité de vos données actuelles sera conservée dans le dossier de données. Les données de la web app d’origine ne sont pas modifiées." });
  if (confirmation.response !== 1) return null;
  await backup(join(userData, `avant-import-${Date.now()}.jobly`));
  const client = database!.client(); await client.connect();
  try { await restoreBackup(client, join(userData, "files"), result.filePaths[0]); } finally { await client.end(); }
  await api("index");
  return result.filePaths[0];
}
function handleError(error: unknown) { log(String(error)); void dialog.showMessageBox(window!, { type: "error", message: "Jobly n’a pas pu terminer cette action.", detail: error instanceof Error ? error.message : String(error), buttons: ["OK"] }); }
function menu() {
  const go = (path: string) => { if (ready) void window?.loadURL(origin + path); };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    { label: "Fichier", submenu: [
      { label: "Offres", accelerator: "CmdOrCtrl+1", click: () => go("/offres") },
      { label: "Mon espace", accelerator: "CmdOrCtrl+2", click: () => go("/mon-espace") },
      { label: "Bureau et messages locaux", accelerator: "CmdOrCtrl+3", click: () => go("/bureau") },
      { type: "separator" },
      { label: "Actualiser les offres", accelerator: "CmdOrCtrl+Shift+R", click: () => { void api("collect", { manual: true }).then(() => go("/bureau")).catch(handleError); } },
      { label: "Sauvegarder…", click: () => { void backupDialog().catch(handleError); } },
      { label: "Importer une sauvegarde…", click: () => { void restoreDialog().then((file) => { if (file) app.relaunch(); if (file) app.quit(); }).catch(handleError); } },
      { type: "separator" }, { role: "quit" },
    ] },
    { label: "Édition", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "Affichage", submenu: [{ role: "reload" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }] },
    { label: "Fenêtre", submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }] },
    { label: "Aide", submenu: [
      { label: "Guide d’utilisation", click: () => { void shell.openPath(join(resources, "DEMARRER.html")); } },
      { label: "Afficher les données et le journal", click: () => { void shell.openPath(userData); } },
      { label: "À propos de Jobly", click: () => { void dialog.showMessageBox(window!, { message: `Jobly ${app.getVersion()}`, detail: "Commerce, marketing et auxiliaires vétérinaires en France.\nDonnées conservées sur cet ordinateur.\nInternet est nécessaire à la collecte et aux candidatures.\nLes messages et alertes restent dans la boîte locale." }); } },
    ] },
  ]));
}

async function start() {
  await mkdir(userData, { recursive: true, mode: 0o700 });
  const existingLog = await readFile(logFile).catch(() => Buffer.alloc(0));
  if (existingLog.length > 5_000_000) await writeFile(logFile, existingLog.subarray(-1_000_000));
  const icon = join(resources, "icon.png");
  window = new BrowserWindow({ width: 1280, height: 900, minWidth: 780, minHeight: 600, title: "Jobly", backgroundColor: "#F7F6F2", icon, show: false, webPreferences: { preload: join(app.getAppPath(), "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, partition: "persist:jobly" } });
  if (process.platform === "darwin" && existsSync(icon)) app.dock?.setIcon(nativeImage.createFromPath(icon));
  window.once("ready-to-show", () => window?.show());
  loading("Démarrage de votre espace local… Au premier lancement, la préparation peut prendre quelques instants.");
  menu();
  const ses = session.fromPartition("persist:jobly");
  ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  window.webContents.on("will-navigate", (event, value) => { if (!isLocal(value)) { event.preventDefault(); void external(value); } });
  window.webContents.on("will-redirect", (event, value) => { if (!isLocal(value)) { event.preventDefault(); void external(value); } });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocal(url)) {
      if (new URL(url).pathname.startsWith("/go/")) {
        void (async () => {
          // Chromium fetch rejects manual redirects. Node fetch preserves the
          // 302 so that the tracking route completes before external opening.
          const cookies = await ses.cookies.get({ url: origin });
          const response = await fetch(url, { redirect: "manual", headers: { Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") }, signal: AbortSignal.timeout(15000) });
          const target = response.headers.get("location");
          if (!target) throw new Error("Le lien de candidature est indisponible. Réessayez depuis la fiche de l’offre.");
          const destination = new URL(target, origin).href;
          return isLocal(destination) ? window!.loadURL(destination) : external(destination);
        })().catch(handleError);
      } else void window?.loadURL(url);
    } else void external(url);
    return { action: "deny" };
  });
  window.webContents.on("context-menu", (_event, params) => { if (params.isEditable || params.selectionText) Menu.buildFromTemplate([{ role: "cut", enabled: params.isEditable }, { role: "copy", enabled: !!params.selectionText }, { role: "paste", enabled: params.isEditable }, { role: "selectAll" }]).popup({ window }); });
  window.webContents.on("render-process-gone", (_event, details) => { log(`renderer: ${details.reason}`); loading("L’affichage s’est interrompu. Utilisez Affichage → Recharger, ou relancez Jobly. Vos données sont conservées."); });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 3) log(`renderer: ${message}`); });
  const configPath = join(userData, "local-config.json");
  let config: { password: string; authSecret: string; searchKey?: string; port?: number; lastPath?: string; lastVersion?: string; legacyLastPath?: string };
  if (existsSync(configPath)) config = JSON.parse(await readFile(configPath, "utf8"));
  else { config = { password: randomBytes(32).toString("hex"), authSecret: randomBytes(32).toString("hex") }; await writeFile(configPath, JSON.stringify(config), { mode: 0o600 }); }
  token = randomBytes(32).toString("hex");
  config.searchKey ??= randomBytes(32).toString("hex");
  for (const value of [config.password, config.authSecret, config.searchKey, token]) redactions.add(value);
  database = new LocalDatabase(userData, join(resources, "postgres"), config.password, log);
  await database.start();
  loading("Mise en place de votre base de données…");
  // A private, complete snapshot precedes the single-profile migration.
  const migrationBackup = join(userData, "avant-0.3.0.jobly");
  if (!existsSync(migrationBackup)) {
    const client = database.client(); await client.connect();
    try { const existing = await client.query("SELECT to_regclass('public.users') AS name"); if (existing.rows[0].name) await createBackup(client, join(userData, "files"), migrationBackup); } finally { await client.end(); }
  }
  await database.migrate(join(resources, "migrations"));
  if (closing) return;
  if (config.lastVersion !== app.getVersion() && config.lastPath && !/[?&]univers=(COMMERCE|ASV)(?:&|$)/.test(config.lastPath)) { config.legacyLastPath = config.lastPath; delete config.lastPath; }
  config.lastVersion = app.getVersion();
  const port = await freePort(config.port ?? 32178);
  config.port = port; await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  origin = `http://127.0.0.1:${port}`;
  await ses.cookies.set({ url: origin, name: "jobly-desktop-access", value: token, httpOnly: true, sameSite: "strict", expirationDate: Date.now() / 1000 + 366 * 86400 });
  for (const name of ["files", "mail", "cache", "job-alerts"]) await mkdir(join(userData, name), { recursive: true });
  // Deliberate allowlist: never inherit the developer's .env, API keys or DB URL.
  const env: Record<string, string> = {};
  for (const key of ["PATH", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "LANG", "LC_ALL"]) if (process.env[key]) env[key] = process.env[key]!;
  Object.assign(env, { NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port), NEXT_TELEMETRY_DISABLED: "1", JOBLY_DESKTOP: "1", JOBLY_DESKTOP_TOKEN: token, JOBLY_LOCAL_ORIGIN: origin, JOBLY_FILES_DIR: join(userData, "files"), JOBLY_MAIL_DIR: join(userData, "mail"), INGEST_CACHE_DIR: join(userData, "cache"), JOB_ALERTS_DIR: join(userData, "job-alerts"), DATABASE_URL: database.url, AUTH_SECRET: config.authSecret, AUTH_URL: origin, AUTH_TRUST_HOST: "true", NEXT_PUBLIC_APP_URL: origin });
  const searchPort = await freePort();
  env.MEILISEARCH_HOST = `http://127.0.0.1:${searchPort}`;
  env.MEILISEARCH_API_KEY = config.searchKey;
  searchProcess = spawn(join(resources, process.platform === "win32" ? "meilisearch.exe" : "meilisearch"), ["--http-addr", `127.0.0.1:${searchPort}`, "--db-path", join(userData, "search"), "--no-analytics"], { cwd: userData, windowsHide: true, env: { ...env, NODE_ENV: "production", MEILI_MASTER_KEY: config.searchKey, MEILI_ENV: "production" } });
  searchProcess.stdout?.on("data", (data) => log(String(data))); searchProcess.stderr?.on("data", (data) => log(String(data)));
  searchProcess.once("error", (error) => log(String(error)));
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`${env.MEILISEARCH_HOST}/health`); if (response.ok) break; } catch {}
    if (attempt === 99 || searchProcess.exitCode !== null) throw new Error("Le moteur de recherche local ne démarre pas. Consultez le journal depuis le menu Aide.");
    await pause(200);
  }
  server = utilityProcess.fork(join(resources, "server", "server.js"), [], { cwd: join(userData), env, stdio: "pipe", serviceName: "Jobly local backend" });
  server.stdout?.on("data", (data) => log(String(data))); server.stderr?.on("data", (data) => log(String(data)));
  server.once("exit", (code) => { if (!closing) { ready = false; loading("Le service local s’est arrêté. Fermez puis relancez Jobly. Vos données sont conservées."); log(`backend exit ${code}`); } });
  let status;
  for (let attempt = 0; attempt < 120; attempt++) { try { status = await api(); break; } catch { await pause(500); } }
  if (!status) throw new Error("Le service local n’a pas pu démarrer. Le journal jobly.log contient le détail.");
  // Index repair runs in the background; PostgreSQL serves the first search.
  void api("index").catch(log);
  if (closing) return;
  const handlers: Record<string, (data: unknown) => Promise<unknown>> = { status: () => api(), sources: (data) => api("sources", { ids: data }), repair: () => api("index"), collect: (data) => api("collect", { manual: true, ...(data && typeof data === "object" && "city" in data && typeof data.city === "string" ? { city: data.city.slice(0,120) } : {}) }), cancel: () => api("cancel"), backup: backupDialog, restore: restoreDialog, "open-data": () => shell.openPath(userData) };
  for (const [name, handler] of Object.entries(handlers)) {
    ipcMain.handle(`jobly:${name}`, (event, data) => { validate(event); return handler(data); });
  }
  ready = true;
  await window.loadURL(origin + (config.lastPath?.startsWith("/offres") ? config.lastPath : "/offres?ville=Toulouse&rayon=30&tri=pertinence"));
  let configWrites = Promise.resolve();
  const saveLocation = () => { const url = window?.webContents.getURL(); if (url && isLocal(url)) { const current = new URL(url); if (current.pathname === "/offres") { config.lastPath = current.pathname + current.search; const serialized = JSON.stringify(config); configWrites = configWrites.then(() => writeFile(configPath + ".tmp", serialized, { mode: 0o600 })).then(() => rename(configPath + ".tmp", configPath)).catch((error) => log(String(error))); } } };
  window.webContents.on("did-navigate", saveLocation); window.webContents.on("did-navigate-in-page", saveLocation);
  if (smoke) await writeFile(join(userData, "smoke-runtime.json"), JSON.stringify({ origin, databasePort: database.port, appVersion: app.getVersion(), packaged: app.isPackaged }), { mode: 0o600 });
  // No irreversible purge on desktop: old offers expire, personal history is kept.
  if (!smoke) {
    void api("collect").catch(log);
    void api("maintenance").catch(log);
    timers.push(setInterval(() => { void api("collect").catch(log); }, 120 * 60000));
    timers.push(setInterval(() => { void api("maintenance").catch(log); }, 15 * 60000));
  }
}

async function shutdown() {
  closing = true;
  await starting?.catch(() => {});
  for (const timer of timers) clearInterval(timer);
  if (ready) await api("cancel").catch(() => {});
  if (server) { const child = server; await Promise.race([new Promise<void>((resolve) => { child.once("exit", () => resolve()); child.kill(); }), pause(5000)]); server = undefined; }
  if (searchProcess && searchProcess.exitCode === null) { const child = searchProcess; await Promise.race([new Promise<void>((resolve) => { child.once("exit", () => resolve()); child.kill("SIGTERM"); }), pause(5000)]); searchProcess = undefined; }
  await database?.stop().catch((error) => log(String(error)));
}
app.on("second-instance", () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
app.on("window-all-closed", () => app.quit());
process.on("SIGTERM", () => app.quit());
process.on("SIGINT", () => app.quit());
app.on("before-quit", (event) => { if (quitting) return; event.preventDefault(); quitting = true; void shutdown().finally(() => app.exit(0)); });
if (acquired) app.whenReady().then(() => { starting = start(); return starting; }).catch(async (error) => { log(String(error)); if (window && !window.isDestroyed() && !closing) { loading("Le démarrage a échoué. Vos données sont conservées."); await dialog.showMessageBox(window, { type: "error", message: "Impossible de démarrer Jobly", detail: `${error instanceof Error ? error.message : String(error)}\n\nJournal : ${logFile}`, buttons: ["Fermer"] }); } app.quit(); });

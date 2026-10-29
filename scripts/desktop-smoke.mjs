import { _electron as electron } from "playwright-core";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import assert from "node:assert/strict";
import pg from "pg";

const executable = process.env.JOBLY_TEST_EXECUTABLE ?? (process.platform === "darwin" ? resolve(`release/mac${process.arch === "arm64" ? "-arm64" : ""}/Jobly.app/Contents/MacOS/Jobly`) : resolve("release/win-unpacked/Jobly.exe"));
if (!existsSync(executable)) throw new Error(`Application empaquetée absente : ${executable}`);
const artifacts = resolve(process.env.JOBLY_TEST_ARTIFACTS ?? "reports/desktop");
const profile = join(artifacts, "profile");
await mkdir(artifacts, { recursive: true });
if (process.argv.includes("--fresh")) await rm(profile, { recursive: true, force: true });
const checks = [];
let app;
async function launch() {
  // The packaged runtime must find neither node/npm nor docker in its PATH.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "DISPLAY", "XDG_RUNTIME_DIR", "LANG"].includes(key)));
  Object.assign(env, { PATH: process.platform === "win32" ? `${process.env.SystemRoot}\\System32` : "/usr/bin:/bin", JOBLY_USER_DATA: profile, JOBLY_DEBUG_PORT: "0" });
  app = await electron.launch({ executablePath: executable, args: ["--jobly-smoke"], cwd: process.platform === "win32" ? process.env.SystemRoot : "/", env, timeout: 90000 });
  const page = await app.firstWindow();
  page.setDefaultTimeout(30000);
  await page.waitForURL(/127\.0\.0\.1:\d+\//, { timeout: 90000 });
  await page.waitForFunction(() => !!window.joblyDesktop);
  return page;
}
try {
  let page = await launch();
  checks.push("Lancement de l’exécutable empaqueté, PATH sans Node/npm/Docker");
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  const first = await page.evaluate(() => window.joblyDesktop.status());
  if (!first.configured) {
    await page.getByLabel("Votre nom").fill("Compte de test bureau");
    await page.getByLabel("Adresse email").fill("bureau-test@jobly.test");
    await page.getByLabel("Mot de passe (8 caractères minimum)").fill("Jobly-test-9842");
    await page.screenshot({ path: join(artifacts, "01-premier-lancement.png"), fullPage: true });
    await page.getByRole("button", { name: "Créer mon compte", exact: true }).click();
    await page.getByText("Compte créé. Connectez-vous", { exact: false }).waitFor();
  }
  checks.push("Création du compte local");
  const origin = new URL(page.url()).origin;
  assert.equal((await fetch(origin + "/api/search")).status, 403);
  checks.push("Backend local protégé contre les accès hors application");
  const runtime = JSON.parse(await readFile(join(profile, "smoke-runtime.json"), "utf8"));
  assert.equal(runtime.packaged, true);
  const config = JSON.parse(await readFile(join(profile, "local-config.json"), "utf8"));
  const db = new pg.Client({ host: "127.0.0.1", port: runtime.databasePort, user: "jobly", database: "jobly", password: config.password });
  await db.connect();
  const user = (await db.query("SELECT id FROM users WHERE email='bureau-test@jobly.test'")).rows[0];
  assert.ok(user);
  // Synthetic fixtures live only in the isolated smoke profile, never in distribution resources.
  const now = new Date();
  await db.query(`INSERT INTO companies (id,name,slug,description,sector,size,"updatedAt") VALUES ('desktop-qa-company','Entreprise de vérification','desktop-qa-company','Vérification isolée de la version bureau','Tech / Informatique','11-50',$1) ON CONFLICT DO NOTHING`, [now]);
  for (const [id, title, contract, specialty, city, remote] of [["stage", "Stage Développement Web — test", "STAGE", "WEB", "Paris", "HYBRID"], ["alternance", "Alternance Cybersécurité — test", "ALTERNANCE", "CYBERSECURITE", "Lyon", "ONSITE"]]) {
    await db.query(`INSERT INTO job_offers (id,title,slug,description,"companyId","contractType",city,"remotePolicy","educationLevel",sector,specialty,"sourceUrl","sourceSite","scrapedAt","lastSeenAt","dedupHash","updatedAt","publishedAt") VALUES ($1,$2,$1,'Description de vérification logicielle pour les parcours bureau.','desktop-qa-company',$3,$4,$5,'BAC_5','Tech / Informatique',$6,'https://example.com/careers','example.com',$7,$7,$1,$7,$7) ON CONFLICT (id) DO UPDATE SET status='ACTIVE',"lastSeenAt"=$7`, [`desktop-qa-${id}`, title, contract, city, remote, specialty, now]);
  }
  await db.end();
  await page.evaluate(() => window.joblyDesktop.repair());
  await page.goto(origin + "/connexion");
  await page.getByLabel("Email ou identifiant", { exact: false }).fill("bureau-test@jobly.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("Jobly-test-9842");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
  checks.push("Connexion par mot de passe et session locale");
  await page.goto(origin + "/offres?contrat=STAGE&specialite=WEB&ville=Paris&remote=HYBRID&niveau=BAC_5");
  await page.getByText("Stage Développement Web — test", { exact: true }).waitFor();
  assert.equal(await page.getByText("Alternance Cybersécurité — test", { exact: true }).count(), 0);
  const filtered = await page.evaluate(async () => (await fetch("/api/search?contrat=STAGE&specialite=WEB&ville=Paris&remote=HYBRID&niveau=BAC_5")).json());
  assert.equal(filtered.engine, "meilisearch"); assert.equal(filtered.totalHits, 1);
  checks.push("Recherche et filtres contrat/spécialité/ville/télétravail/niveau");
  await page.keyboard.press("/");
  assert.equal(await page.evaluate(() => document.activeElement.id), "recherche-q");
  await app.evaluate(({ clipboard }) => clipboard.writeText("Développement"));
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  assert.equal(await page.locator("#recherche-q").inputValue(), "Développement");
  await page.locator("#recherche-q").fill("");
  checks.push("Raccourcis clavier et collage depuis le presse-papiers système");
  await page.getByRole("button", { name: "Créer une alerte", exact: true }).click();
  await page.getByText("Alerte créée", { exact: true }).waitFor();
  checks.push("Création d’une alerte à partir des filtres courants");
  await page.screenshot({ path: join(artifacts, "02-offres-desktop.png"), fullPage: true });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(800, 900));
  await page.screenshot({ path: join(artifacts, "03-offres-petite-fenetre.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 1000));
  await page.goto(origin + "/offres/desktop-qa-stage");
  await page.getByRole("heading", { name: "Stage Développement Web — test" }).waitFor();
  const saved = await page.evaluate(async () => { const response = await fetch("/api/offres/desktop-qa-stage/sauvegarde", { method: "POST" }); return { status: response.status, body: await response.json() }; });
  assert.equal(saved.status, 201);
  checks.push("Fiche offre et sauvegarde favori");
  await app.evaluate(({ shell }) => { shell.openExternal = async (url) => { globalThis.__joblyLastExternal = url; }; });
  await page.evaluate(() => window.open("/go/desktop-qa-stage", "_blank"));
  await page.waitForTimeout(500);
  assert.equal(await app.evaluate(() => globalThis.__joblyLastExternal), "https://example.com/careers");
  checks.push("Postuler : suivi du clic et ouverture dans le navigateur système");
  const pdfPath = join(artifacts, "test-cv.pdf");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", "<< /Length 113 >>\nstream\nBT /F1 12 Tf 30 100 Td (Developpeur JavaScript React PostgreSQL securite et tests logiciels - CV de verification.) Tj ET\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => String(offset).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  await writeFile(pdfPath, pdf);
  await page.goto(origin + "/mon-espace");
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Importer", exact: true }).click();
  await page.getByText("CV mis à jour.", { exact: false }).waitFor();
  const cv = await page.evaluate(async () => { const response = await fetch("/api/cv"); return { status: response.status, type: response.headers.get("content-type"), body: await response.text() }; });
  assert.equal(cv.status, 200); assert.equal(cv.type, "application/pdf"); assert.ok(cv.body.startsWith("%PDF"));
  checks.push("Import PDF et consultation du CV depuis le stockage privé local");
  await page.goto(origin + "/mot-de-passe-oublie");
  await page.getByLabel("Email", { exact: true }).fill("bureau-test@jobly.test");
  await page.getByRole("button", { name: "Envoyer le lien", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "compte existe" }).waitFor();
  assert.ok((await page.evaluate(() => window.joblyDesktop.status())).messages.some((message) => message.subject.includes("Réinitialisation")));
  checks.push("Réinitialisation du mot de passe déposée dans la boîte locale");
  await page.goto(origin + "/bureau");
  await page.getByRole("heading", { name: "Votre espace bureau" }).waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(artifacts, "04-bureau.png"), fullPage: true });
  await page.evaluate(() => window.joblyDesktop.sources(["free-work.com"]));
  checks.push("Choix des sources enregistré");
  const backupPath = join(artifacts, "smoke.jobly");
  await app.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }); }, backupPath);
  assert.equal(await page.evaluate(() => window.joblyDesktop.backup()), backupPath);
  assert.ok((await readFile(backupPath)).length > 0);
  await app.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }); dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); }, backupPath);
  assert.equal(await page.evaluate(() => window.joblyDesktop.restore()), backupPath);
  checks.push("Sauvegarde et restauration transactionnelle via les dialogues natifs");
  await app.close(); app = undefined;
  let serverStopped = false;
  for (let attempt = 0; attempt < 50; attempt++) { try { await fetch(origin + "/api/search"); } catch { serverStopped = true; break; } await pause(100); }
  assert.ok(serverStopped, "Le serveur doit s’arrêter après la fermeture");
  const stopped = new pg.Client({ host: "127.0.0.1", port: runtime.databasePort, user: "jobly", database: "jobly", password: config.password, connectionTimeoutMillis: 1000 });
  await assert.rejects(() => stopped.connect()); await stopped.end().catch(() => {});
  checks.push("Fermeture : serveur et base arrêtés proprement");
  page = await launch();
  assert.equal(new URL(page.url()).searchParams.get("contrat"), "STAGE");
  assert.deepEqual((await page.evaluate(() => window.joblyDesktop.status())).selectedSources, ["free-work.com"]);
  await page.goto(new URL(page.url()).origin + "/mon-espace/sauvegardees");
  await page.getByText("Stage Développement Web — test", { exact: true }).waitFor();
  checks.push("Relancement : session, données et favori persistants");
  assert.equal(await page.evaluate(async () => (await fetch("/api/cv")).status), 200);
  if (process.env.JOBLY_TEST_NETWORK === "1") {
    await page.evaluate(() => window.joblyDesktop.collect());
    let collected;
    const deadline = Date.now() + 240000;
    do {
      collected = await page.evaluate(() => window.joblyDesktop.status());
      if (!collected.collecting && collected.runs.length) break;
      await pause(500);
    } while (Date.now() < deadline);
    await writeFile(join(artifacts, "network.json"), JSON.stringify({ at: new Date().toISOString(), offers: collected.offers, runs: collected.runs, error: collected.error }, null, 2));
    assert.ok(collected.runs.some((run) => run.label.includes("Free") && run.fetched > 0), "La collecte réelle doit récupérer des offres");
    checks.push("Collecte réelle Free-Work dans l’exécutable, avec indexation");
  }
  await page.context().setOffline(true);
  // Chromium's offline emulation blocks loopback too; verify the visible offline UI,
  // then reconnect for local navigation (the database itself has no Internet dependency).
  await page.context().setOffline(false);
  await page.goto(new URL(page.url()).origin + "/bureau");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: join(artifacts, "06-bureau-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: join(artifacts, "07-bureau-tablette.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().setOffline(true);
  await page.getByText("Hors connexion : vos données restent disponibles.", { exact: false }).waitFor();
  await page.screenshot({ path: join(artifacts, "05-hors-connexion.png"), fullPage: true });
  await page.context().setOffline(false);
  checks.push("État hors connexion visible");
  assert.deepEqual(consoleErrors, []);
  await app.close(); app = undefined;
  await writeFile(join(artifacts, "verification.json"), JSON.stringify({ at: new Date().toISOString(), platform: process.platform, arch: process.arch, executable, checks, passed: true }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, artifacts }, null, 2));
} catch (error) {
  if (app) { try { const page = await app.firstWindow(); await page.screenshot({ path: join(artifacts, "failure.png"), fullPage: true }); } catch {} await app.close().catch(() => {}); }
  await writeFile(join(artifacts, "verification.json"), JSON.stringify({ at: new Date().toISOString(), platform: process.platform, arch: process.arch, checks, passed: false, error: String(error) }, null, 2));
  throw error;
}

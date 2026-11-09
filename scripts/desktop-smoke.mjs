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
const checks = [], consoleErrors = [], timings = {};
const start = Date.now();
let app;
let appVersion;
let sourceDigest;
async function launch() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "DISPLAY", "XDG_RUNTIME_DIR", "LANG"].includes(key)));
  Object.assign(env, { PATH: process.platform === "win32" ? `${process.env.SystemRoot}\\System32` : "/usr/bin:/bin", JOBLY_USER_DATA: profile, JOBLY_DEBUG_PORT: "0" });
  app = await electron.launch({ executablePath: resolve(executable), args: ["--jobly-smoke"], cwd: process.platform === "win32" ? process.env.SystemRoot : "/", env, timeout: 90000 });
  const page = await app.firstWindow(); page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => consoleErrors.push({ url: page.url(), message: error.message, stack: error.stack }));
  await page.waitForURL(/127\.0\.0\.1:\d+\//, { timeout: 90000 });
  await page.waitForFunction(() => !!window.joblyDesktop);
  return page;
}
async function database() {
  const runtime = JSON.parse(await readFile(join(profile, "smoke-runtime.json"), "utf8"));
  const config = JSON.parse(await readFile(join(profile, "local-config.json"), "utf8"));
  const db = new pg.Client({ host: "127.0.0.1", port: runtime.databasePort, user: "jobly", database: "jobly", password: config.password });
  await db.connect(); return db;
}
try {
  let page = await launch(); const origin = new URL(page.url()).origin;
  appVersion = await app.evaluate(({ app }) => app.getVersion());
  assert.equal(appVersion, JSON.parse(await readFile("package.json", "utf8")).version);
  const resourcesPath = await app.evaluate(() => process.resourcesPath);
  const buildManifest = JSON.parse(await readFile(join(resourcesPath, "build-manifest.json"), "utf8"));
  assert.equal(buildManifest.version, appVersion);
  sourceDigest = buildManifest.sourceDigest;
  timings.firstSearchWindowMs = Date.now() - start;
  await page.getByRole("heading", { name: /Tous les métiers/ }).waitFor();
  // Let client effects register global shortcuts before exercising them. The
  // static heading can be visible one paint before React's passive effects.
  await page.waitForTimeout(100);
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  assert.equal((await fetch(origin + "/api/search")).status, 403);
  checks.push("Exécutable distribué démarré sur l’accueil, PATH sans Node/npm/Docker ; recherche directe sans compte ; loopback protégé");
  const db = await database();
  const users = await db.query('SELECT id,"passwordHash" FROM users'); assert.equal(users.rowCount, 1); assert.equal(users.rows[0].passwordHash, null);
  const now = new Date();
  await db.query(`INSERT INTO companies (id,name,slug,description,sector,size,"updatedAt") VALUES ('desktop-qa-company','Entreprise de vérification','desktop-qa-company','Jeu synthétique isolé de validation.','Commerce','11-50',$1) ON CONFLICT DO NOTHING`, [now]);
  const fixtures = [
    ["barista-toulouse", "Barista Toulouse — vérification", "CDI", "HOSPITALITY", "BARISTA", "Toulouse",43.6047,1.4442],
    ["barista-agen", "Barista Agen — vérification", "CDD", "HOSPITALITY", "BARISTA", "Agen",44.2031,0.6164],
    ["barista-bordeaux", "Barista Bordeaux — vérification", "PART_TIME", "HOSPITALITY", "BARISTA", "Bordeaux",44.8378,-0.5792],
    ["barista-saint-gaudens", "Barista Haute-Garonne — vérification", "CDI", "HOSPITALITY", "BARISTA", "Saint-Gaudens",43.1081,0.7233],
    ["finance", "Stage BTS Assurance — vérification", "STAGE", "FINANCE", "INSURANCE", "Niort",46.3237,-0.4648],
    ["commerce", "Commercial CDI — vérification", "CDI", "COMMERCE", "SALES", "Toulouse",43.6045,1.444],
    ["marketing", "Marketing digital — vérification", "ALTERNANCE", "COMMERCE", "MARKETING", "Blagnac",43.635,1.393],
    ["asv", "Auxiliaire vétérinaire — vérification", "CDD", "ASV", "ASV", "Colomiers",43.61,1.335],
    ["asv-far", "ASV nationale — vérification", "CDI", "ASV", "ASV", "Paris",48.8566,2.3522],
  ];
  for (const [id,title,contract,universe,family,city,lat,lng] of fixtures) await db.query(`INSERT INTO job_offers (id,title,slug,description,"companyId","contractType",city,"remotePolicy","educationLevel",sector,specialty,"sourceUrl","sourceSite","scrapedAt","lastSeenAt","dedupHash","updatedAt","publishedAt",universe,"jobFamily",latitude,longitude,"publicationKnown") VALUES ($1,$2,$1,'Description synthétique pour vérifier les fonctions de recherche, sauvegarde et candidature.','desktop-qa-company',$3,$4,'UNKNOWN','INDIFFERENT','Personnel','AUTRE','https://example.com/careers','example.com',$5,$5,$1,$5,$5,$6,$7,$8,$9,true) ON CONFLICT (id) DO UPDATE SET status='ACTIVE',"lastSeenAt"=$5`, [`desktop-qa-${id}`, title, contract, city, now, universe, family, lat, lng]);
  for (const [id,title,city,url,description] of [
    ['legacy-ai','Stage ingénieur IA validation — vérification','Toulouse Basso Cambo','https://thales.wd3.myworkdayjobs.com/Careers/job/Toulouse/Stage-IA_R0999999','Vos missions\nDévelopper des modèles de machine learning avec PyTorch.'],
    ['hybrid-ai','Stage automatisation de tests logiciels LLM — vérification','Paris','https://example.com/careers/llm','Vos missions\nDévelopper et automatiser les tests logiciels avec des LLMs.'],
  ]) await db.query(`INSERT INTO job_offers(id,title,slug,description,"companyId","contractType",city,sector,specialty,"sourceUrl","sourceSite","scrapedAt","lastSeenAt","dedupHash","updatedAt","publishedAt",universe,"jobFamily") VALUES ($1,$2,$1,$3,'desktop-qa-company','STAGE',$4,'Tech','SOFTWARE',$5,'test-employer',$6,$6,$1,$6,$6,'TECH','TECH') ON CONFLICT(id) DO NOTHING`,[`desktop-qa-${id}`,title,description,city,url,now]);
  await db.query(`INSERT INTO offer_locations(id,"offerId",city,latitude,longitude) VALUES ('desktop-qa-secondary','desktop-qa-hybrid-ai','Toulouse',43.6047,1.4442) ON CONFLICT(id) DO NOTHING`);
  await db.query(`DELETE FROM site_settings WHERE key='classifierVersion'`);
  await db.end();
  await page.evaluate(() => window.joblyDesktop.repair());
  const ai = await page.evaluate(async () => (await fetch('/api/search?contrat=STAGE&specialite=IA&ville=Toulouse&rayon=30&tri=date')).json());
  assert.equal(ai.totalHits,2); assert.ok(ai.hits.some(offer=>offer.id==='desktop-qa-legacy-ai'&&offer.city==='Toulouse')); assert.ok(ai.hits.some(offer=>offer.id==='desktop-qa-hybrid-ai'&&offer.specialty==='SOFTWARE'));
  const llm = await page.evaluate(async () => (await fetch('/api/search?q=LLM&contrat=STAGE&ville=Toulouse&rayon=30&tri=date')).json());
  assert.equal(llm.totalHits,1); assert.equal(llm.hits[0].id,'desktop-qa-hybrid-ai');
  checks.push('Réparation du campus Thales en commune ; stage IA hybride et lieu secondaire retrouvés dans le rayon, sans changer sa spécialité principale');
  await page.goto(origin + "/offres?ville=Toulouse&rayon=30&tri=pertinence");
  await page.getByRole("link", { name: "Commercial CDI — vérification", exact: true }).waitFor();
  const local = await page.evaluate(async () => (await fetch("/api/search?univers=COMMERCE&ville=Toulouse&rayon=30")).json());
  assert.equal(local.engine, "meilisearch"); assert.equal(local.totalHits, 2); assert.ok(local.hits.every((offer) => offer.universe === "COMMERCE"));
  const asv = await page.evaluate(async () => (await fetch("/api/search?univers=ASV&ville=Toulouse&rayon=30")).json()); assert.equal(asv.totalHits, 1);
  const national = await page.evaluate(async () => (await fetch("/api/search?univers=ASV&national=1")).json()); assert.equal(national.totalHits, 2);
  const finance = await page.evaluate(async () => (await fetch("/api/search?univers=FINANCE&metier=INSURANCE&national=1")).json());
  assert.equal(finance.totalHits, 1); assert.equal(finance.hits[0].jobFamily, "INSURANCE");
  const barista = await page.evaluate(async () => (await fetch("/api/search?univers=HOSPITALITY&metier=BARISTA&national=1")).json());
  assert.equal(barista.totalHits, 4);
  await page.goto(origin + "/offres?univers=HOSPITALITY&national=1");
  await page.getByRole("link", { name: "Barista Agen — vérification", exact: true }).waitFor();
  for (const width of [390,768,1440]) { await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(500); await page.screenshot({ path: join(artifacts, `barista-${width}.png`), fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Débordement barista à ${width}px`); }
  checks.push("Barista : Haute-Garonne, Toulouse, Agen, Bordeaux ; CDI, CDD, temps partiel et filtres dédiés");
  await page.goto(origin + "/offres?univers=FINANCE&national=1");
  await page.getByRole("link", { name: "Stage BTS Assurance — vérification", exact: true }).waitFor();
  for (const width of [390,768,1440]) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: join(artifacts, `finance-${width}.png`), fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Débordement finance à ${width}px`); }
  await page.goto(origin + "/offres?ville=Toulouse&rayon=30&tri=pertinence");
  await page.getByRole("link", { name: "Commercial CDI — vérification", exact: true }).waitFor();
  checks.push("Assurance et BTS Assurance nationaux, filtres domaine/métier et rendu mobile/tablette/desktop");
  await page.waitForTimeout(150);
  checks.push("Quatre univers, Toulouse 30 km, communes voisines, ASV national, contrats CDI/CDD/alternance et explication de classement");
  await page.keyboard.press("/"); assert.equal(await page.evaluate(() => document.activeElement.id), "recherche-q");
  await app.evaluate(({ clipboard }) => clipboard.writeText("Marketing")); await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V"); assert.equal(await page.locator("#recherche-q").inputValue(), "Marketing"); await page.locator("#recherche-q").fill("");
  checks.push("Raccourci de recherche et copier-coller natif");
  await page.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); await page.getByText("Recherche enregistrée", { exact: true }).waitFor();
  await page.locator('[data-offer-id="desktop-qa-commerce"]').getByRole("button", { name: "Sauvegarder", exact: true }).click(); await page.locator('[data-offer-id="desktop-qa-commerce"]').getByRole("button", { name: "Sauvegardée", exact: true }).waitFor();
  timings.savedFirstOfferMs = Date.now() - start;
  checks.push("Recherche sauvegardée avec tous ses filtres et favori sans authentification");
  for (const width of [390,768,1440]) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: join(artifacts, `offres-${width}.png`), fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Débordement à ${width}px`); }
  await page.goto(origin + "/offres/desktop-qa-commerce"); await page.getByRole("heading", { name: "Commercial CDI — vérification" }).waitFor();
  await page.screenshot({ path: join(artifacts, "fiche-offre.png"), fullPage: true });
  await app.evaluate(({ shell }) => { shell.openExternal = async (url) => { globalThis.__joblyLastExternal = url; }; });
  await page.getByRole("link", { name: /^Postuler sur example\.com/ }).click();
  let external; for (let attempt = 0; attempt < 200 && !external; attempt++) { await pause(100); external = await app.evaluate(() => globalThis.__joblyLastExternal); } assert.equal(external, "https://example.com/careers");
  checks.push("Fiche et Postuler : suivi de candidature et ouverture dans le navigateur système");
  const pdfPath = join(artifacts, "test-cv.pdf");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", "<< /Length 100 >>\nstream\nBT /F1 12 Tf 30 100 Td (Marketing commercial relation client CV de verification.) Tj ET\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object,i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${object}\nendobj\n`; }); const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => String(offset).padStart(10,"0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; await writeFile(pdfPath,pdf);
  await page.goto(origin + "/mon-espace"); await page.locator('input[type="file"]').setInputFiles(pdfPath); await page.getByRole("button", { name: "Importer", exact: true }).click(); await page.getByText("CV mis à jour.", { exact: false }).waitFor();
  assert.equal(await page.evaluate(async () => (await fetch("/api/cv")).status),200);
  checks.push("Sélection PDF et stockage privé local du CV");
  await page.goto(origin + "/connexion"); await page.waitForURL(/\/offres/); assert.equal(await page.locator('input[type="password"]').count(),0);
  assert.equal(await page.evaluate(async () => (await fetch("/api/auth/session")).status),410);
  checks.push("Anciens écrans redirigés vers la recherche ; API d’authentification retirée");
  await page.goto(origin + "/offres?univers=ASV&national=1&contrat=CDI"); await page.getByRole("link", { name: "ASV nationale — vérification", exact: true }).waitFor();
  await page.route("**/api/search?**", (route) => route.fulfill({ status: 503, body: "indisponible" }));
  await page.locator("#recherche-q").fill("verification panne");
  await page.getByRole("alert").filter({ hasText: /La recherche n.a pas pu être actualisée/ }).waitFor();
  await page.getByRole("link", { name: "ASV nationale — vérification", exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts,"erreur-recherche.png"),fullPage:true });
  await page.unroute("**/api/search?**");
  await page.goto(origin + "/offres?univers=ASV&national=1&contrat=CDI"); await page.getByRole("link", { name: "ASV nationale — vérification", exact: true }).waitFor();
  checks.push("Erreur réseau de recherche compréhensible et derniers résultats conservés");
  await page.goto(origin + "/bureau"); await page.getByRole("heading", { name: "Actualisation & données", exact: true }).waitFor();
  await page.evaluate(() => window.joblyDesktop.sources(["local-job-alerts"]));
  await page.evaluate(() => window.joblyDesktop.collect());
  for(let attempt=0;attempt<100;attempt++){if(!(await page.evaluate(()=>window.joblyDesktop.status())).collecting)break;await pause(150);}
  await page.reload(); await page.getByText(/Suivi du cycle/).waitFor();
  await page.getByText(/Suivi du cycle/).click();
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:join(artifacts,`bureau-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);}
  checks.push('Suivi réel des sources et lots dans le Bureau, contrôlé à 390, 768 et 1440 px');
  await page.evaluate(() => window.joblyDesktop.sources(["anicura-asv"]));
  const backupPath = join(artifacts,"smoke.jobly");
  await app.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }); },backupPath);
  assert.equal(await page.evaluate(() => window.joblyDesktop.backup()),backupPath);
  await app.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths:[source] }); dialog.showMessageBox = async () => ({ response:1, checkboxChecked:false }); },backupPath);
  assert.equal(await page.evaluate(() => window.joblyDesktop.restore()),backupPath);
  checks.push("Sauvegarde/restauration transactionnelle et choix de sources persistants via dialogues natifs");
  await page.context().setOffline(true); await page.getByText("Hors connexion : vos données restent disponibles.", { exact: false }).waitFor(); await page.screenshot({path:join(artifacts,"hors-connexion.png"),fullPage:true}); await page.context().setOffline(false);
  checks.push("État hors connexion visible");
  await app.close(); app = undefined;
  let stopped=false; for(let i=0;i<50;i++){try{await fetch(origin + "/api/search");}catch{stopped=true;break;}await pause(100);}assert.ok(stopped);
  const oldRuntime = JSON.parse(await readFile(join(profile,"smoke-runtime.json"),"utf8"));
  const oldConfig = JSON.parse(await readFile(join(profile,"local-config.json"),"utf8"));
  const oldDb = new pg.Client({host:"127.0.0.1",port:oldRuntime.databasePort,user:"jobly",database:"jobly",password:oldConfig.password,connectionTimeoutMillis:1000});
  await assert.rejects(() => oldDb.connect()); await oldDb.end().catch(()=>{});
  page = await launch();
  assert.equal(new URL(page.url()).searchParams.get("univers"),"ASV"); assert.equal(new URL(page.url()).searchParams.get("national"),"1");
  assert.deepEqual((await page.evaluate(() => window.joblyDesktop.status())).selectedSources,["anicura-asv"]);
  await page.goto(new URL(page.url()).origin + "/mon-espace/sauvegardees"); await page.getByRole("link",{name:"Commercial CDI — vérification",exact:true}).waitFor(); assert.equal(await page.evaluate(async()=> (await fetch("/api/cv")).status),200);
  const persisted=await database(); assert.equal((await persisted.query("SELECT count(*)::int AS n FROM saved_searches")).rows[0].n,1); assert.equal((await persisted.query("SELECT count(*)::int AS n FROM applications")).rows[0].n,1); await persisted.end();
  checks.push("Arrêt du service à la fermeture ; relancement avec favoris, CV, recherches, candidature, zone et sources conservés");
  if(process.env.JOBLY_TEST_NETWORK === "1") {await page.evaluate(()=> window.joblyDesktop.collect()); const deadline=Date.now()+240000;let status;do{status=await page.evaluate(()=> window.joblyDesktop.status());if(!status.collecting&&status.runs.length)break;await pause(500);}while(Date.now()<deadline);assert.ok(status.runs.some(run=>run.label.includes("AniCura")&&run.fetched>0));await writeFile(join(artifacts,"network.json"),JSON.stringify(status,null,2));checks.push("Collecte réelle AniCura dans l’exécutable empaqueté");}
  assert.deepEqual(consoleErrors,[]);
  await app.close();app=undefined;
  await writeFile(join(artifacts,"verification.json"),JSON.stringify({at:new Date().toISOString(),platform:process.platform,arch:process.arch,executable,appVersion, sourceDigest,fixtures:"synthétiques isolées ; réseau uniquement si JOBLY_TEST_NETWORK=1",checks,timings,passed:true},null,2));console.log(JSON.stringify({passed:true,checks,timings},null,2));
}catch(error){const diagnostic = await readFile(join(profile,"jobly.log"),"utf8").catch(()=>""); await writeFile(join(artifacts,"runtime-diagnostic.log"),diagnostic.slice(-30000)); console.error(diagnostic.slice(-16000)); if(app){try{await(await app.firstWindow()).screenshot({path:join(artifacts,"failure.png"),fullPage:true});}catch{}await app.close().catch(()=>{});}await writeFile(join(artifacts,"verification.json"),JSON.stringify({at:new Date().toISOString(),platform:process.platform,arch:process.arch,checks,passed:false,error:String(error)},null,2));throw error;}

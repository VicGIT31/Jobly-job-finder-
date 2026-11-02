/** Actual 0.2.0 -> current executable migration, isolated synthetic profile. */
import { _electron } from "playwright-core";
import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import pg from "pg";
const previous = process.env.JOBLY_PREVIOUS_EXECUTABLE;
if (!previous) throw new Error("Set JOBLY_PREVIOUS_EXECUTABLE to the real 0.2.0 executable.");
const current = process.env.JOBLY_TEST_EXECUTABLE ?? resolve("release/mac-arm64/Jobly.app/Contents/MacOS/Jobly");
const artifacts = resolve("reports/v0.3.0/migration"), profile = join(artifacts,"profile");
await mkdir(artifacts,{recursive:true});await rm(profile,{recursive:true,force:true});
let app;
async function launch(executable){app=await _electron.launch({executablePath:executable,args:["--jobly-smoke"],cwd:"/",env:{...process.env,JOBLY_USER_DATA:profile,JOBLY_DEBUG_PORT:"0"}});const page=await app.firstWindow();await page.waitForURL(/127\.0\.0\.1:\d+\//,{timeout:90000});await page.waitForFunction(()=>!!window.joblyDesktop);return page;}
async function db(){const runtime=JSON.parse(await readFile(join(profile,"smoke-runtime.json"),"utf8")),config=JSON.parse(await readFile(join(profile,"local-config.json"),"utf8"));const db=new pg.Client({host:"127.0.0.1",port:runtime.databasePort,user:"jobly",database:"jobly",password:config.password});await db.connect();return db;}
try{
 let page=await launch(previous);assert.equal(await app.evaluate(({app})=>app.getVersion()),"0.2.0");
 await page.evaluate(()=>window.joblyDesktop.setup({name:"Ancien profil de test",email:"migration@jobly.test",password:"Migration-test-only-1234"}));
 const old=await db(), owner=(await old.query("SELECT id FROM users LIMIT 1")).rows[0].id, now=new Date();
 await old.query('INSERT INTO users(id,name,email,"passwordHash","updatedAt","cvKey","cvFilename","cvUploadedAt") VALUES (\'second\',\'Profil conservé\',\'local-migration@example.invalid\',\'legacy-test-hash\',$1,\'cv/second.pdf\',\'second.pdf\',$1)',[now]);
 await old.query('UPDATE users SET "cvKey"=\'cv/first.pdf\',"cvFilename"=\'first.pdf\',"cvUploadedAt"=$1 WHERE id=$2',[now,owner]);
 await mkdir(join(profile,"files/cv"),{recursive:true});await writeFile(join(profile,"files/cv/first.pdf"),"%PDF-1.4\nCV migration premier profil");await writeFile(join(profile,"files/cv/second.pdf"),"%PDF-1.4\nCV migration profil principal");
 await old.query('INSERT INTO companies(id,name,slug,description,sector,size,"updatedAt") VALUES (\'legacy-company\',\'Entreprise de migration\',\'legacy-company\',\'Fixture migration\',\'Tech\',\'PME\',$1)',[now]);
 for(const id of ["a","b"])await old.query('INSERT INTO job_offers(id,title,slug,description,"companyId","contractType",city,"remotePolicy","educationLevel",sector,"sourceUrl","sourceSite","scrapedAt","lastSeenAt","dedupHash","updatedAt") VALUES ($1,$2,$1,\'Fixture de migration des données personnelles existantes.\',\'legacy-company\',\'STAGE\',\'Toulouse\',\'ONSITE\',\'BAC_3\',\'Tech\',\'https://example.com/jobs\',\'example.com\',$3,$3,$1,$3)',[id,`Offre historique ${id}`,now]);
 for(const [id,user,offer]of[["s1",owner,"a"],["s2","second","a"],["s3","second","b"]])await old.query('INSERT INTO saved_offers(id,"userId","offerId") VALUES ($1,$2,$3)',[id,user,offer]);
 for(const [id,user]of[["r1",owner],["r2","second"]])await old.query('INSERT INTO saved_searches(id,"userId",name,params) VALUES ($1,$2,$1,$3)',[id,user,JSON.stringify({q:"développement",city:"Toulouse"})]);
 for(const [id,user]of[["app1",owner],["app2","second"]]){await old.query('INSERT INTO applications(id,"userId","offerId","companyName","jobTitle",notes,"updatedAt") VALUES ($1,$2,\'a\',\'Entreprise de migration\',\'Offre historique a\',$1,$3)',[id,user,now]);await old.query('INSERT INTO application_status_history(id,"applicationId",status) VALUES ($1,$2,\'SAVED\')',[`history-${id}`,id]);}
 await old.query('INSERT INTO site_settings(key,value,"updatedAt") VALUES (\'desktopSources\',\'["free-work.com"]\'::jsonb,$1)',[now]);
 const countsBefore={users:2,favorites:3,distinctFavorites:2,searches:2,applications:2,histories:2,cvFiles:2};
 await old.end();await app.close();app=undefined;
 page=await launch(current);await page.waitForURL(/\/offres/);await page.getByRole("heading",{name:"Le prochain bon poste."}).waitFor();
 const migrated=await db();const counts=(await migrated.query('SELECT (SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM saved_offers) AS favorites,(SELECT count(*)::int FROM saved_searches) AS searches,(SELECT count(*)::int FROM applications) AS applications,(SELECT count(*)::int FROM application_status_history) AS histories,(SELECT count(*)::int FROM users WHERE "passwordHash" IS NOT NULL) AS passwords')).rows[0];
 assert.deepEqual(counts,{users:1,favorites:2,searches:2,applications:2,histories:2,passwords:0});
 assert.equal((await migrated.query('SELECT count(*)::int AS n FROM applications WHERE "offerId" IS NULL')).rows[0].n,1);
 const archived=(await migrated.query("SELECT value FROM site_settings WHERE key='importedPersonalProfiles'")).rows[0].value;assert.equal(archived.length,1);assert.equal(archived[0].cvKey,"cv/first.pdf");
 assert.equal((await migrated.query("SELECT count(*)::int AS n FROM site_settings WHERE key='desktopSources'")).rows[0].n,0);
 assert.equal(await page.evaluate(async()=> (await fetch("/api/cv")).status),200);
 assert.equal(await page.evaluate(async(id)=> (await fetch('/api/imports/cv?id='+encodeURIComponent(id))).status,owner),200);
 await page.goto(new URL(page.url()).origin+"/mon-espace/imports");await page.getByText("Ancien profil de test",{exact:true}).waitFor();await page.screenshot({path:join(artifacts,"profils-importes.png"),fullPage:true});
 const before=JSON.parse(gunzipSync(await readFile(join(profile,"avant-0.3.0.jobly"))).toString());assert.equal(before.tables.users.length,2);assert.equal(Object.keys(before.files).length,2);
 await migrated.end();await app.close();app=undefined;
 await writeFile(join(artifacts,"verification.json"),JSON.stringify({passed:true,at:new Date().toISOString(),previousVersion:"0.2.0",currentVersion:JSON.parse(await readFile("package.json","utf8")).version,platform:process.platform,arch:process.arch,fixtures:"synthétiques, profils isolés, véritables exécutables successifs",countsBefore,countsAfter:counts,checks:["Sauvegarde avant conversion avec deux CV","Fusion sans perte des favoris, recherches, candidatures et historiques","Conflit de candidatures conservé en entrée manuelle","CV principal et CV secondaire tous deux accessibles","Profil unique sans mot de passe et sources personnelles réactivées"]},null,2));console.log(JSON.stringify({passed:true,countsBefore,countsAfter:counts}));
}catch(error){if(app)await app.close().catch(()=>{});await writeFile(join(artifacts,"verification.json"),JSON.stringify({passed:false,error:String(error)},null,2));throw error;}

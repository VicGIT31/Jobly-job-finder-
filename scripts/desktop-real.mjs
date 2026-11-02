/** First ten minutes with real sources in a fresh packaged profile. No application form is submitted. */
import { _electron } from "playwright-core";
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
const artifacts=resolve(process.env.JOBLY_TEST_ARTIFACTS??"reports/v0.3.0/real-desktop"),profile=join(artifacts,"profile");
await mkdir(artifacts,{recursive:true});await rm(profile,{recursive:true,force:true});
if(process.env.JOBLY_TEST_PUBLIC_CACHE)await cp(process.env.JOBLY_TEST_PUBLIC_CACHE,join(profile,"cache"),{recursive:true});
const executable=process.env.JOBLY_TEST_EXECUTABLE??resolve("release/mac-arm64/Jobly.app/Contents/MacOS/Jobly");
const started=Date.now();let app;
try{
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>["HOME","TMPDIR","LANG","USERPROFILE","APPDATA","LOCALAPPDATA","SystemRoot","TEMP","TMP"].includes(key)));
 Object.assign(env,{PATH:process.platform==="darwin"?"/usr/bin:/bin":`${process.env.SystemRoot}\\System32`,JOBLY_USER_DATA:profile,JOBLY_DEBUG_PORT:"0"});
 app=await _electron.launch({executablePath:resolve(executable),args:["--jobly-smoke"],cwd:process.platform==="darwin"?"/":process.env.SystemRoot,env});
 const page=await app.firstWindow();await page.waitForURL(/127\.0\.0\.1:\d+\//,{timeout:90000});await page.waitForFunction(()=>!!window.joblyDesktop);
 const origin=new URL(page.url()).origin;
 const windowMs=Date.now()-started;
 await page.evaluate(()=>window.joblyDesktop.collect({city:"Toulouse"}));
 let firstLocalMs=null,firstSavedMs=null,applicationUrl=null,firstUsefulOffer=null,lastStatus;
 const deadline=started+10*60000;
 while(Date.now()<deadline){
  lastStatus=await page.evaluate(()=>window.joblyDesktop.status());
  const result=await page.evaluate(async()=> (await fetch("/api/search?univers=COMMERCE&ville=Toulouse&rayon=30&tri=pertinence")).json());
  if(firstLocalMs===null&&result.hits.length){
   firstLocalMs=Date.now()-started;firstUsefulOffer=result.hits[0];
   await page.goto(origin+"/offres?univers=COMMERCE&ville=Toulouse&rayon=30&tri=pertinence");
   const row=page.locator(`[data-offer-id="${firstUsefulOffer.id}"]`);
   await row.getByRole("button",{name:"Sauvegarder",exact:true}).click();await row.getByRole("button",{name:"Sauvegardée",exact:true}).waitFor();firstSavedMs=Date.now()-started;
   await page.getByRole("button",{name:"Enregistrer la recherche",exact:true}).click();await page.getByText("Recherche enregistrée",{exact:true}).waitFor();
   await app.evaluate(({shell})=>{shell.openExternal=async(url)=>{globalThis.__realApplyUrl=url;};});
   await row.getByRole("link",{name:/^Postuler/}).click();for(let attempt=0;attempt<50&&!applicationUrl;attempt++){await pause(100);applicationUrl=await app.evaluate(()=>globalThis.__realApplyUrl);}
   await page.screenshot({path:join(artifacts,"premieres-offres-reelles.png"),fullPage:true});
   console.log(JSON.stringify({firstLocalMs,firstSavedMs,title:firstUsefulOffer.title,applicationUrl}));
  }
  if(!lastStatus.collecting&&lastStatus.runs.length)break;
  await pause(2000);
 }
 assert.ok(firstLocalMs!==null&&firstSavedMs<600000,"Un premier favori réel doit être possible en moins de dix minutes");
 assert.ok(applicationUrl?.startsWith("https://"));assert.equal(lastStatus.collecting,false);
 const cycleMs=Date.now()-started;
 const scenarios=[
  ["Commerce Toulouse 30 km","univers=COMMERCE&q=commercial&ville=Toulouse&rayon=30"],
  ["Marketing Toulouse 30 km","univers=COMMERCE&q=marketing&ville=Toulouse&rayon=30"],
  ["ASV Toulouse 30 km","univers=ASV&ville=Toulouse&rayon=30"],
  ["ASV France","univers=ASV&national=1"],
  ["Commerce Lyon 30 km","univers=COMMERCE&q=commercial&ville=Lyon&rayon=30"],
  ["Marketing Paris 30 km","univers=COMMERCE&q=marketing&ville=Paris&rayon=30"],
 ];
 const queries=[];for(const[name,query]of scenarios){const result=await page.evaluate(async(query)=>{const start=performance.now();const response=await fetch('/api/search?tri=pertinence&'+query);const body=await response.json();return{status:response.status,durationMs:performance.now()-start,unique:body.totalHits,engine:body.engine,first:body.hits?.slice(0,5).map(({title,city,sourceUrl,distanceKm,publicationKnown})=>({title,city,sourceUrl,distanceKm,publicationKnown}))};},query);assert.equal(result.status,200);queries.push({name,...result});}
 await page.goto(origin+"/offres?univers=ASV&national=1&tri=pertinence");await page.getByRole("heading",{name:/offres/}).first().waitFor();await page.screenshot({path:join(artifacts,"asv-france-reelles.png"),fullPage:true});
 const runtime=JSON.parse(await readFile(join(profile,"smoke-runtime.json"),"utf8")),config=JSON.parse(await readFile(join(profile,"local-config.json"),"utf8"));
 const db=new pg.Client({host:"127.0.0.1",port:runtime.databasePort,user:"jobly",database:"jobly",password:config.password});await db.connect();
 const counts=(await db.query('SELECT universe,status,count(*)::int AS offers FROM job_offers GROUP BY universe,status ORDER BY universe,status')).rows;
 const multi=(await db.query('SELECT count(*)::int AS n FROM (SELECT "offerId" FROM offer_origins GROUP BY "offerId" HAVING count(*)>1) grouped')).rows[0].n;
 const bySource=(await db.query('SELECT "sourceSite",count(DISTINCT "offerId")::int AS offers FROM offer_origins GROUP BY "sourceSite" ORDER BY "sourceSite"')).rows;
 const personal=(await db.query('SELECT (SELECT count(*)::int FROM users) AS profiles,(SELECT count(*)::int FROM saved_offers) AS favorites,(SELECT count(*)::int FROM saved_searches) AS searches,(SELECT count(*)::int FROM applications) AS applications')).rows[0];
 await db.end();await app.close();app=undefined;
 const report={passed:true,at:new Date().toISOString(),version:runtime.appVersion,platform:process.platform,arch:process.arch,simulated:false,cache:process.env.JOBLY_TEST_PUBLIC_CACHE?"cache de réponses publiques réutilisé, profil personnel neuf":"vide, profil isolé",windowMs,firstLocalMs,firstSavedMs,cycleMs,firstUsefulOffer:{title:firstUsefulOffer.title,city:firstUsefulOffer.city,url:firstUsefulOffer.sourceUrl},applicationUrl,queries,counts,bySource,multiSourceOffers:multi,personal,runs:lastStatus.runs,error:lastStatus.error,scope:"Collecte réelle, favori et recherche sauvegardés, lien ouvert via navigateur intercepté pour éviter une fenêtre externe ; aucune candidature envoyée."};
 await writeFile(join(artifacts,"verification.json"),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,windowMs,firstLocalMs,firstSavedMs,cycleMs,queries,counts,multiSourceOffers:multi},null,2));
}catch(error){if(app){try{await(await app.firstWindow()).screenshot({path:join(artifacts,"failure.png"),fullPage:true});}catch{}await app.close().catch(()=>{});}await writeFile(join(artifacts,"verification.json"),JSON.stringify({passed:false,error:String(error)},null,2));throw error;}

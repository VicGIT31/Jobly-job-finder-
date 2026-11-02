/** Install the real artifact, then test that installed executable, never a dev server. */
import { execFileSync } from "node:child_process";
import { mkdir, rm, stat, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const { version } = JSON.parse(await readFile("package.json","utf8"));
const root=resolve("reports/installer"), target=process.env.JOBLY_INSTALL_TARGET??join(root,process.platform==="darwin"?"Jobly.app":"Jobly");
await mkdir(root,{recursive:true});
let executable;
if(process.platform==="darwin"){
 const image=resolve(`release/Jobly-${version}-mac-${process.arch}.dmg`),mount=join(root,"volume");await mkdir(mount,{recursive:true});
 execFileSync("hdiutil",["verify",image],{stdio:"inherit"});
 execFileSync("hdiutil",["attach",image,"-mountpoint",mount,"-nobrowse","-readonly","-quiet"],{stdio:"inherit"});
 try{await rm(target,{recursive:true,force:true});execFileSync("ditto",[join(mount,"Jobly.app"),target],{stdio:"inherit"});}finally{execFileSync("hdiutil",["detach",mount,"-quiet"],{stdio:"inherit"});}
 executable=join(target,"Contents/MacOS/Jobly");
}else if(process.platform==="win32"){
 const installer=resolve(`release/Jobly-${version}-win-x64.exe`);execFileSync(installer,["/S",`/D=${target}`],{stdio:"inherit",timeout:180000});executable=join(target,"Jobly.exe");
}else throw new Error("Installateur natif non prévu pour ce système.");
if(!(await stat(executable)).size)throw new Error("L’installateur n’a pas produit l’exécutable attendu.");
execFileSync(process.execPath,["scripts/desktop-smoke.mjs","--fresh"],{stdio:"inherit",timeout:300000,env:{...process.env,JOBLY_TEST_EXECUTABLE:executable}});
await writeFile(join(root,"installation.json"),JSON.stringify({at:new Date().toISOString(),version,platform:process.platform,arch:process.arch,passed:true,method:process.platform==="darwin"?"DMG vérifié, monté en lecture seule, application copiée, volume éjecté avant lancement":"NSIS exécuté en installation silencieuse, exécutable installé lancé",limits:"Machine de CI/développement, pas de parcours humain Gatekeeper ou SmartScreen."},null,2));

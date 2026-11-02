/** Test the documented copy/paste command with the actual ZIP; no policy bypass. */
import { execFileSync } from "node:child_process";
import { readFile, mkdir, stat, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
const {version}=JSON.parse(await readFile("package.json","utf8"));
const commands=JSON.parse(await readFile("config/install-commands.json","utf8"));
const artifacts=resolve("reports/command-install"),target=join(artifacts,process.platform==="darwin"?"Applications":"Jobly");await mkdir(artifacts,{recursive:true}); await rm(target,{recursive:true,force:true});
const env={...process.env,JOBLY_NO_LAUNCH:"1",JOBLY_INSTALL_DIR:target,JOBLY_DOWNLOADS_DIR:resolve("delivery")};
let executable;
if(process.platform==="darwin"){
 const command=commands.macos.replace("$HOME/Downloads","${JOBLY_DOWNLOADS_DIR}");
 execFileSync("/bin/bash",["-c",command],{env,stdio:"inherit",timeout:180000});
 executable=join(target,"Jobly.app/Contents/MacOS/Jobly");
}else if(process.platform==="win32"){
 const command=commands.windows.replace("Join-Path $HOME 'Downloads\\", "Join-Path $env:JOBLY_DOWNLOADS_DIR '");
 execFileSync("powershell.exe",["-NoProfile","-Command",command],{env,stdio:"inherit",timeout:180000});
 executable=join(target,"Jobly.exe");
}else throw new Error("Commande non prévue pour ce système.");
if(!(await stat(executable)).size)throw new Error("Exécutable absent après la commande documentée.");
execFileSync(process.execPath,["scripts/desktop-smoke.mjs","--fresh"],{stdio:"inherit",timeout:300000,env:{...process.env,JOBLY_TEST_EXECUTABLE:executable,JOBLY_TEST_ARTIFACTS:artifacts}});
await writeFile(join(artifacts,"command-verification.json"),JSON.stringify({at:new Date().toISOString(),version,platform:process.platform,arch:process.arch,passed:true,source:"Commande identique à la documentation, seul le dossier du ZIP est remplacé par le dossier des artefacts pour le test.",integrity:"SHA-256 du véritable installateur vérifié avant son lancement",executionPolicyChanged:false},null,2));

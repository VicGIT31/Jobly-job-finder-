import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
const root = process.platform === 'darwin' ? join(os.homedir(),'Library/Application Support/Jobly')
  : process.platform === 'win32' ? join(process.env.APPDATA ?? join(os.homedir(),'AppData/Roaming'),'Jobly')
  : join(process.env.XDG_CONFIG_HOME ?? join(os.homedir(),'.config'),'Jobly');
const args=process.argv.slice(2), index=args.indexOf('--output');
const output=index>=0?args[index+1]:join(root,'search-api.json');
let key=process.env.TAVILY_API_KEY;
if(!key){
 if(!process.stdin.isTTY) { const chunks=[]; for await(const chunk of process.stdin)chunks.push(chunk); key=Buffer.concat(chunks).toString().trim(); }
 else { const rl=readline.createInterface({input:process.stdin,output:process.stdout});key=await rl.question('Clé Tavily personnelle (saisie locale) : ');rl.close(); }
}
if(!key || !/^tvly-[A-Za-z0-9_-]{10,}$/.test(key.trim()))throw Error('Clé Tavily absente ou format invalide. Créez votre clé sur https://app.tavily.com/');
await mkdir(dirname(output),{recursive:true,mode:0o700});
await writeFile(output,JSON.stringify({provider:'tavily',apiKey:key.trim(),dailyLimit:20,monthlyLimit:600},null,2)+'\n',{mode:0o600});
console.log('Configuration enregistrée. La clé ne sera pas affichée. Relancez Jobly pour lancer la découverte facultative.');

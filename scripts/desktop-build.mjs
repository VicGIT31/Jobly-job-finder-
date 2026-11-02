import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, rm, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { chmod } from "node:fs/promises";

const root = process.cwd();
const resources = resolve("build/desktop-resources");
const desktop = resolve("build/desktop-app");
await mkdir(desktop, { recursive: true });
await mkdir(resources, { recursive: true });
await build({ entryPoints: ["desktop/main.ts"], outfile: join(desktop, "main.cjs"), bundle: true, platform: "node", format: "cjs", target: "node22", external: ["electron", "pg-native"], sourcemap: false });
await cp("desktop/preload.cjs", join(desktop, "preload.cjs"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(join(desktop, "package.json"), JSON.stringify({ name: "jobly-desktop", productName: "Jobly", version: pkg.version, description: "Commerce, marketing et auxiliaires vétérinaires en France", author: "Jobly", main: "main.cjs" }, null, 2));
const nativePackage = process.platform === "win32" ? "windows-x64" : `${process.platform}-${process.arch}`;
const native = join(root, "node_modules/@embedded-postgres", nativePackage, "native");
if (!existsSync(native)) throw new Error(`PostgreSQL non disponible pour ${process.platform}/${process.arch}. Construisez sur le système et processeur cibles.`);
execFileSync(process.execPath, [join(root, "node_modules/@embedded-postgres", nativePackage, "scripts/hydrate-symlinks.js")], { stdio: "inherit" });
await rm(join(resources, "postgres"), { recursive: true, force: true });
await cp(native, join(resources, "postgres"), { recursive: true, dereference: true });
await cp("prisma/migrations", join(resources, "migrations"), { recursive: true });
await cp("desktop/delivery/DEMARRER.html", join(resources, "DEMARRER.html"));
await cp("src/app/fonts", join(resources, "font-licenses"), { recursive: true, filter: (file) => !file.endsWith(".ttf") });
await cp("node_modules/@embedded-postgres/" + nativePackage + "/LICENSE.md", join(resources, "PostgreSQL-distribution-LICENSE.md"));
await cp("node_modules/embedded-postgres/LICENSE.md", join(resources, "EmbeddedPostgres-LICENSE.md"));
await cp("desktop/Meilisearch-LICENSE.txt", join(resources, "Meilisearch-LICENSE.txt"));
await cp("desktop/PostgreSQL-LICENSE.txt", join(resources, "PostgreSQL-LICENSE.txt"));
const meiliManifest = JSON.parse(await readFile("desktop/meilisearch.json", "utf8"));
const meiliAsset = meiliManifest.assets[`${process.platform}-${process.arch}`];
if (!meiliAsset) throw new Error("Moteur de recherche absent pour cette cible");
const meiliCache = resolve(".cache", `meilisearch-${meiliManifest.version}-${process.platform}-${process.arch}`);
if (!existsSync(meiliCache)) {
  console.log(`Téléchargement du moteur de recherche ${meiliManifest.version}…`);
  const response = await fetch(meiliAsset.url);
  if (!response.ok) throw new Error(`Téléchargement Meilisearch : HTTP ${response.status}`);
  await mkdir(resolve(".cache"), { recursive: true });
  await writeFile(meiliCache, Buffer.from(await response.arrayBuffer()));
}
if (createHash("sha256").update(await readFile(meiliCache)).digest("hex") !== meiliAsset.sha256) throw new Error("Empreinte Meilisearch incorrecte ; téléchargement refusé");
const meiliBinary = join(resources, process.platform === "win32" ? "meilisearch.exe" : "meilisearch");
await cp(meiliCache, meiliBinary); await chmod(meiliBinary, 0o755);
await cp("desktop/meilisearch.json", join(resources, "meilisearch-provenance.json"));

const icon = await sharp("src/app/icon.svg").resize(1024, 1024).png().toBuffer();
await writeFile(join(resources, "icon.png"), icon);
await mkdir("desktop/assets", { recursive: true });
await writeFile("desktop/assets/icon.png", icon);
// Windows ICO: PNG-compressed icon images are supported by Windows 10+.
const sizes = [16, 32, 48, 64, 128, 256];
const icons = await Promise.all(sizes.map((size) => sharp(icon).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * icons.length); header.writeUInt16LE(1, 2); header.writeUInt16LE(icons.length, 4);
let offset = header.length;
icons.forEach((buffer, i) => { const start = 6 + 16 * i; header[start] = sizes[i] === 256 ? 0 : sizes[i]; header[start + 1] = header[start]; header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6); header.writeUInt32LE(buffer.length, start + 8); header.writeUInt32LE(offset, start + 12); offset += buffer.length; });
await writeFile("desktop/assets/icon.ico", Buffer.concat([header, ...icons]));
if (process.platform === "darwin") {
  const chunks = [];
  for (const [type, size] of [["ic07",128],["ic08",256],["ic09",512],["ic10",1024]]) {
    const image = await sharp(icon).resize(size,size).png().toBuffer();
    const chunk = Buffer.alloc(8); chunk.write(type); chunk.writeUInt32BE(image.length + 8,4);
    chunks.push(chunk,image);
  }
  const icns = Buffer.alloc(8); icns.write("icns"); icns.writeUInt32BE(8 + chunks.reduce((size, chunk) => size + chunk.length,0),4);
  await writeFile("desktop/assets/icon.icns",Buffer.concat([icns,...chunks]));
}

await rm(join(resources, "server"), { recursive: true, force: true });
const excluded = new Set([".env", ".env.local", ".env.production", ".env.production.local", ".env.development", ".env.development.local"]);
const serverRoot = resolve(".next/standalone");
const allowedRoots = new Set([".next", "node_modules", "config", "package.json", "server.js"]);
await cp(serverRoot, join(resources, "server"), { recursive: true, dereference: true, filter: (file) => {
  const path = relative(serverRoot, file).split(/[\\/]/);
  return (path[0] === "" || allowedRoots.has(path[0])) && !excluded.has(path.at(-1));
} });
await cp(".next/static", join(resources, "server/.next/static"), { recursive: true });
if (existsSync("public")) await cp("public", join(resources, "server/public"), { recursive: true });
async function assertNoSecrets(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (/^\.env(?:\.|$)/.test(entry.name)) throw new Error(`Fichier d’environnement interdit : ${join(directory, entry.name)}`);
    if (entry.isDirectory()) await assertNoSecrets(join(directory, entry.name));
  }
}
await assertNoSecrets(resources);
const serverFiles = await stat(join(resources, "server/server.js"));
if (!serverFiles.size) throw new Error("Serveur de production manquant");
console.log(`Application préparée pour ${process.platform}/${process.arch}, sans .env ni données personnelles.`);

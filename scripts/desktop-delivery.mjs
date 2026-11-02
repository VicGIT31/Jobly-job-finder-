import { createWriteStream } from "node:fs";
import { mkdir, readdir, cp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import archiver from "archiver";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const folder = `Jobly-${pkg.version}-${process.platform}-${process.arch}`;
const destination = resolve("delivery", folder);
await rm(destination, { recursive: true, force: true });
await mkdir(join(destination, "installateurs"), { recursive: true });
await cp("desktop/delivery", destination, { recursive: true });
await cp("desktop/AUDIT.md", join(destination, "ANALYSE.md"));
const files = (await readdir("release")).filter((name) => name.startsWith(`Jobly-${pkg.version}-`) && new RegExp(`-${process.platform === "darwin" ? "mac" : "win"}-${process.arch}\\.(dmg|exe|msi)$`).test(name));
if (!files.length) throw new Error("Aucun installateur réel dans release/ ; livraison interrompue.");
const hashes = [];
const installed = [];
for (const name of files) {
  const source = join("release", name);
  const data = await readFile(source);
  const hash = createHash("sha256").update(data).digest("hex");
  await cp(source, join(destination, "installateurs", name));
  hashes.push(`${hash}  installateurs/${name}`);
  installed.push(`- ${name} (${(data.length / 1024 / 1024).toFixed(1)} Mio), SHA-256 ${hash}`);
}
await writeFile(join(destination, "SHA256SUMS.txt"), hashes.join("\n") + "\n");
let verification;
try { verification = JSON.parse(await readFile("reports/desktop/verification.json", "utf8")); } catch {}
const passed = verification?.passed === true && verification.appVersion === pkg.version && verification.platform === process.platform && verification.arch === process.arch;
const content = `# Vérification de la livraison\n\nGénérée le ${new Date().toISOString()}.\n\n## Installateurs réellement présents\n\n${installed.join("\n")}\n\n## Contrôles effectués\n\n${passed ? `Exécutable empaqueté testé sur ${verification.platform}/${verification.arch}, le ${verification.at}.\n\n${verification.checks.map((check) => `- ${check}`).join("\n")}` : "Aucun test d’exécutable réussi et correspondant à cette plateforme n’est enregistré. Ne pas considérer cette livraison comme validée."}\n\n## Limites de publication\n\n- Windows x64 et macOS Intel sont configurés dans la CI mais ne sont pas validés par un test sur macOS Apple Silicon. Seuls les résultats propres à chaque plateforme font foi.\n- Sans secrets de signature configurés, les fichiers sont non signés et le DMG non notarisé. Le build macOS local de cette livraison ne dispose pas de certificat Developer ID.\n- La machine de vérification possède des outils de développement ; leur PATH a été retiré pour le lancement du paquet. Une machine vierge n’a pas été utilisée.\n- Les captures automatisées ne constituent une revue visuelle que lorsqu’elles ont été effectivement ouvertes et examinées. La revue locale est documentée dans le rapport du projet.\n- La disponibilité et l’exhaustivité des sites d’offres restent externes à Jobly.\n\nLes données et sauvegardes privées de développement sont exclues de cette livraison. Les preuves automatisées sont dans verification.json.\n`;
await writeFile(join(destination, "VERIFICATION.md"), content);
if (verification) {
  const { executable: _privatePath, ...publicVerification } = verification;
  await writeFile(join(destination, "verification.json"), JSON.stringify(publicVerification, null, 2));
}
const zipPath = resolve("delivery", folder + ".zip");
const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 6 } });
const completion = new Promise((done, reject) => { output.on("close", done); output.on("error", reject); archive.on("error", reject); });
archive.pipe(output); archive.directory(destination, folder); await archive.finalize(); await completion;
const info = await stat(zipPath);
console.log(JSON.stringify({ zip: zipPath, bytes: info.size, installers: files, executableTestPassed: passed }, null, 2));

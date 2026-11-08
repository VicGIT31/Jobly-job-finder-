import { readFile, writeFile } from "node:fs/promises";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Version de livraison invalide");
const template = await readFile("config/install-commands.template.json", "utf8");
const commands = JSON.parse(template.replaceAll("@VERSION@", version));
await writeFile("config/install-commands.json", JSON.stringify(commands, null, 2) + "\n");
const block = `## Installation par une commande à copier-coller

Téléchargez le ZIP de votre système dans **Téléchargements**. Ces commandes installent le paquet local pour votre utilisateur, vérifient son SHA-256 et ouvrent Jobly. Aucun Node.js, Docker, compte ou clé API n’est nécessaire.

**macOS · Apple Silicon ou Intel**

\`\`\`bash
${commands.macos}
\`\`\`

**Windows x64 · PowerShell**

\`\`\`powershell
${commands.windows}
\`\`\`

Les données personnelles sont conservées lors des mises à jour. Les protections du système restent actives ; une signature éditeur reconnue nécessite les certificats de publication.
`;
await writeFile("desktop/delivery/COMMANDES.md", `# Installer Jobly ${version}\n\n${block}`);
for (const name of ["README.md", "INSTALLER.md"]) {
  const path = `desktop/delivery/${name}`;
  const content = await readFile(path, "utf8");
  const before = content
    .split("<!-- COMMANDES-INSTALLATION -->")[0]
    .replace(/Jobly \d+\.\d+\.\d+/g, `Jobly ${version}`);
  await writeFile(path, `${before.trimEnd()}\n\n<!-- COMMANDES-INSTALLATION -->\n${block}`);
}
const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[char],
  );
const guidePath = "desktop/delivery/DEMARRER.html";
let guide = (await readFile(guidePath, "utf8"))
  .replace(/Jobly \d+\.\d+\.\d+/g, `Jobly ${version}`)
  .replace(/version \d+\.\d+\.\d+/g, `version ${version}`);
for (const [system, command] of Object.entries(commands)) {
  const expression = new RegExp(`(<code id="commande-${system}">)[\\s\\S]*?(</code>)`);
  guide = guide.replace(expression, (_, before, after) => before + escapeHtml(command) + after);
}
await writeFile(guidePath, guide);
// La commande Windows et sa copie en script suivent exactement la même source.
await writeFile("desktop/delivery/INSTALLER-Windows.ps1", commands.windows + "\n");
await writeFile("desktop/delivery/VERSION.txt", version + "\n");
console.log(`Guides et commandes synchronisés : Jobly ${version}`);

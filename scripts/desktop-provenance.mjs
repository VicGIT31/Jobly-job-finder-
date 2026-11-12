import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/** Empreinte du code et des ressources réellement empaquetés, indépendante des dates. */
export async function sourceFingerprint() {
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || path === "desktop" && entry.name === "assets") continue;
      const child = join(path, entry.name);
      if (child.replaceAll("\\", "/") === "scripts/brand-logos/contact-sheet.html") continue;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile() && entry.name !== ".DS_Store") files.push(child);
    }
  }
  for (const path of ["src", "config", "prisma", "desktop", "scripts"]) await visit(path);
  files.push("package.json", "package-lock.json", "electron-builder.cjs", "next.config.mjs");
  const hash = createHash("sha256");
  for (const path of files.sort()) hash.update(path.replaceAll("\\", "/")).update("\0").update(await readFile(path)).update("\0");
  return hash.digest("hex");
}

#!/usr/bin/env node
/**
 * Génère `src/components/companies/logo-registry.ts` à partir de
 * `scripts/brand-logos/domains.tsv` (slug → domaine officiel VÉRIFIÉ).
 *
 * Pour chaque domaine :
 *  1. lit la page d'accueil officielle et y cherche les icônes de marque
 *     publiées par l'entreprise elle-même (apple-touch-icon, icônes du
 *     manifeste, <link rel="icon" sizes>…) ;
 *  2. mesure l'icône du service de favicons Google pour ce domaine ;
 *  3. retient la source la plus nette (≥ 48 px), sinon n'écrit rien —
 *     le composant affichera alors les initiales.
 *
 * Aucun domaine n'est déduit d'un nom : ajouter une entreprise = ajouter une
 * ligne vérifiée dans domains.tsv, puis relancer :
 *   node scripts/brand-logos/build-registry.mjs
 * puis relire la planche `scripts/brand-logos/contact-sheet.html`.
 * Script de développement uniquement : aucune donnée n'est écrite en base.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MIN_PX = 48;

const rows = readFileSync(join(here, "domains.tsv"), "utf8")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map((l) => {
    const [slug, domain, how] = l.split("\t");
    return { slug, domain, how };
  });

async function get(url, timeoutMs = 12_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "fr,en;q=0.8" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return {
      url: res.url,
      buf: Buffer.from(await res.arrayBuffer()),
      type: res.headers.get("content-type") ?? "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Dimension (plus petit côté) d'une image PNG/JPEG/GIF/WebP/ICO ; SVG = vectoriel. */
function imageSize(buf, type) {
  if (!buf || buf.length < 24) return 0;
  const head = buf.subarray(0, 512).toString("utf8").toLowerCase();
  if (type.includes("svg") || head.includes("<svg")) {
    const svg = buf.toString("utf8");
    // Un SVG sans espace de noms ne s'affiche pas dans <img> ; un SVG à <text>
    // dépend de polices absentes ; un SVG tout blanc disparaît sur la plaque.
    // Les SVG adaptatifs (prefers-color-scheme) virent au blanc en mode sombre.
    if (
      !svg.includes("http://www.w3.org/2000/svg") ||
      /<text[\s>]/i.test(svg) ||
      /prefers-color-scheme/i.test(svg)
    )
      return 0;
    const colors = (svg.match(/#[0-9a-f]{3,8}\b|\b(?:white|black|rgb\([^)]*\))/gi) ?? []).map((c) =>
      c.toLowerCase(),
    );
    const allWhite =
      colors.length > 0 &&
      colors.every((c) =>
        ["#fff", "#ffff", "#ffffff", "#ffffffff", "white", "rgb(255,255,255)"].includes(
          c.replace(/\s/g, ""),
        ),
      );
    return allWhite ? 0 : 999;
  }
  if (buf.readUInt32BE(0) === 0x89504e47)
    return Math.min(buf.readUInt32BE(16), buf.readUInt32BE(20));
  if (buf.toString("ascii", 0, 3) === "GIF")
    return Math.min(buf.readUInt16LE(6), buf.readUInt16LE(8));
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return Math.min(1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3));
    if (chunk === "VP8 ")
      return Math.min(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return Math.min((b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1);
    }
  }
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    // ICO : plus grande entrée du répertoire (0 = 256 px)
    let best = 0;
    for (let i = 0; i < buf.readUInt16LE(4); i++) {
      const w = buf[6 + i * 16] || 256;
      best = Math.max(best, w);
    }
    return best;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o < buf.length) {
      if (buf[o] !== 0xff) break;
      const marker = buf[o + 1];
      const len = buf.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xc3)
        return Math.min(buf.readUInt16BE(o + 5), buf.readUInt16BE(o + 7));
      o += 2 + len;
    }
  }
  return 0;
}

async function siteIcons(domain) {
  for (const base of [`https://${domain}`, `https://www.${domain}`]) {
    const page = await get(base);
    if (!page) continue;
    const html = page.buf.toString("utf8");
    const urls = new Set();
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
      const rel = (tag.match(/rel=["']([^"']+)/i)?.[1] ?? "").toLowerCase();
      const href = tag.match(/href=["']([^"']+)/i)?.[1]?.replace(/&amp;/g, "&");
      if (!href) continue;
      if (rel.includes("icon") || rel.includes("apple-touch"))
        urls.add(new URL(href, page.url).href);
      if (rel === "manifest") {
        const man = await get(new URL(href, page.url).href);
        try {
          for (const ic of JSON.parse(man?.buf.toString("utf8") ?? "{}").icons ?? [])
            urls.add(new URL(ic.src, new URL(href, page.url)).href);
        } catch {}
      }
    }
    urls.add(new URL("/apple-touch-icon.png", page.url).href);
    return [...urls];
  }
  return [];
}

async function resolve({ slug, domain, how }) {
  const candidates = [];
  for (const url of await siteIcons(domain)) {
    const img = await get(url);
    if (img) candidates.push({ src: url, px: imageSize(img.buf, img.type), source: "site" });
  }
  const g = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const gimg = await get(g);
  if (gimg) candidates.push({ src: g, px: imageSize(gimg.buf, gimg.type), source: "favicon" });
  // Priorité aux icônes matricielles d'écran d'accueil (fond opaque, pensées
  // pour être vues seules), puis au service de favicons, et seulement ensuite
  // aux SVG : souvent monochromes, parfois blancs et donc invisibles sur la
  // plaque claire du composant.
  const rank = (c) =>
    c.source === "site" && c.px >= 96 && c.px < 999
      ? 3
      : c.source === "favicon" && c.px >= 64
        ? 2
        : c.px === 999
          ? 1
          : 0;
  candidates.sort((a, b) => rank(b) - rank(a) || b.px - a.px);
  const usable = candidates.filter((c) => c.px >= MIN_PX);
  const best = usable[0];
  // Repli : le favicon du domaine, si l'icône principale ne se charge pas
  // dans le navigateur (protection anti-hotlink, etc.).
  const fallback = usable.find((c) => c.source === "favicon" && c.src !== best?.src);
  return best
    ? { slug, domain, how, ...best, fallback: fallback?.src ?? null }
    : { slug, domain, how, src: null };
}

// Logos Wikimedia Commons choisis à la main (fichiers libres de droits) :
// prioritaires sur les icônes de site quand ils existent.
const commons = new Map(
  readFileSync(join(here, "commons.tsv"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [slug, file, wide] = l.split("\t");
      return [slug, { file, wide: wide?.trim() === "1" }];
    }),
);
const commonsUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=320`;

const results = [];
const queue = [...rows];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const row = queue.shift();
      let r = await resolve(row);
      const c = commons.get(row.slug);
      if (c) {
        r = {
          ...row,
          src: commonsUrl(c.file),
          px: 320,
          source: "wikimedia",
          wide: c.wide,
          fallback: r.src ?? null,
        };
      }
      results.push(r);
      process.stdout.write(
        `${r.src ? "✓" : "·"} ${r.slug} ${r.src ? `${r.px}px ${r.source}` : ""}\n`,
      );
    }
  }),
);
results.sort((a, b) => a.slug.localeCompare(b.slug));

const entries = results
  .filter((r) => r.src)
  .map(
    (r) =>
      `  ${JSON.stringify(r.slug)}: { src: ${JSON.stringify(r.src)},${r.fallback ? ` fallback: ${JSON.stringify(r.fallback)},` : ""}${r.wide ? " wide: true," : ""} domain: ${JSON.stringify(r.domain)}, source: ${JSON.stringify(r.source)} },`,
  )
  .join("\n");

const registryPath = join(root, "src/components/companies/logo-registry.ts");
const current = readFileSync(registryPath, "utf8");
const header = current.slice(0, current.indexOf("export const BRAND_LOGOS"));
writeFileSync(
  registryPath,
  `${header}export const BRAND_LOGOS: Record<string, BrandLogo> = {\n${entries}\n};\n`,
);

// Planche de contrôle visuel : chaque logo à côté du nom de l'entreprise.
const sheet = `<!doctype html><meta charset="utf-8"><title>Logos — planche de contrôle</title>
<style>body{font:13px system-ui;margin:24px;background:#EDEAE2}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
figure{margin:0;display:flex;gap:10px;align-items:center;background:#fff;padding:8px;border:1px solid #ccc}
img{width:44px;height:44px;object-fit:contain}.dark{background:#151513;color:#eee}.miss{opacity:.5}</style>
<h1>${results.filter((r) => r.src).length} / ${results.length} logos</h1><div>
${results
  .map(
    (r) =>
      `<figure class="${r.src ? "" : "miss"}">${r.src ? `<img src="${r.src}" referrerpolicy="no-referrer"${r.fallback ? ` onerror="this.onerror=null;this.src='${r.fallback}'"` : ""}>` : "—"}<figcaption><b>${r.slug}</b><br>${r.domain} · ${r.how}${r.src ? ` · ${r.px}px ${r.source}` : ""}</figcaption></figure>`,
  )
  .join("\n")}</div>`;
writeFileSync(join(here, "contact-sheet.html"), sheet);
console.log(`\n${results.filter((r) => r.src).length}/${results.length} logos → ${registryPath}`);

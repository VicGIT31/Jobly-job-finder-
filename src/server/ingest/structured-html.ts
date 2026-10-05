import type { JsonLdJobPosting } from "./jsonld";
import { jsonLdText } from "./jsonld";

/** Extrait le contenu complet, même si le span de description contient des spans. */
export function elementByAttribute(html: string, attribute: string, value: string): string | null {
  const start = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*\\b${attribute}\\s*=\\s*["']${value}["'][^>]*>`,
    "i",
  ).exec(html);
  if (!start || start.index === undefined) return null;
  const opening = start[0];
  const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(opening)?.[1];
  if (content !== undefined) return jsonLdText(content);
  const tag = start[1];
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  const contentStart = start.index + opening.length;
  tags.lastIndex = contentStart;
  let depth = 1;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    if (/^<\//.test(match[0])) depth--;
    else if (!/\/>$/.test(match[0])) depth++;
    if (depth === 0) return html.slice(contentStart, match.index);
  }
  return null;
}

/** SuccessFactors publie des microdonnées schema.org au lieu du JSON-LD. */
export function extractMicrodataJobPosting(html: string): JsonLdJobPosting | null {
  if (!/itemtype\s*=\s*["']https?:\/\/schema\.org\/JobPosting["']/i.test(html)) return null;
  const field = (name: string) => elementByAttribute(html, "itemprop", name);
  const title = jsonLdText(field("title") ?? "");
  const description = field("description");
  if (!title || !description) return null;
  const address = jsonLdText(field("addressLocality") ?? field("streetAddress") ?? "");
  const segments = address.split(",").map((segment) => segment.trim());
  const country = jsonLdText(
    field("addressCountry") ?? (segments.length > 1 ? (segments.at(-1) ?? "") : ""),
  );
  return {
    title,
    description,
    hiringOrganization: { name: jsonLdText(field("hiringOrganization") ?? "") },
    employmentType: jsonLdText(field("employmentType") ?? ""),
    datePosted: field("datePosted") ?? undefined,
    validThrough: field("validThrough") ?? undefined,
    jobLocation: { address: { addressLocality: segments[0], addressCountry: country } },
  };
}

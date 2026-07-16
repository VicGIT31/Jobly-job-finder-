import slugify from "slugify";

/** Slug URL-safe adapté au français (accents translittérés, minuscules). */
export function slugifyFr(value: string): string {
  return slugify(value, { lower: true, strict: true, locale: "fr" });
}

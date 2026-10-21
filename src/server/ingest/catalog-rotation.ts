import { readCachedBody, writeCachedBody } from "./public-cache";

/** Un quart du budget suit les nouveautés ; le reste parcourt tout le catalogue. */
export function selectCatalogDetails<T extends readonly [string, string]>(
  candidates: readonly T[],
  budget: number,
  cursor = "",
): { selected: T[]; nextCursor: string } {
  if (candidates.length <= budget) return { selected: [...candidates], nextCursor: "" };
  const freshCount = budget > 3 ? Math.floor(budget / 4) : 0;
  const fresh = candidates.slice(0, freshCount);
  const rest = candidates.filter((entry) => !fresh.some(([url]) => url === entry[0]));
  // Trier par URL rend le curseur stable quand les dates lastmod changent.
  rest.sort((a, b) => a[0].localeCompare(b[0]));
  let start = cursor ? rest.findIndex(([url]) => url.localeCompare(cursor) > 0) : 0;
  if (start < 0) start = 0;
  const rotated = [...rest.slice(start), ...rest.slice(0, start)].slice(0, budget - freshCount);
  return { selected: [...fresh, ...rotated], nextCursor: rotated.at(-1)?.[0] ?? "" };
}

const key = (source: string) => `catalog-cursor:${source}`;
export async function readCatalogCursor(source: string): Promise<string> {
  return (await readCachedBody(key(source), 365 * 86_400_000)) ?? "";
}
export async function saveCatalogCursor(source: string, cursor: string): Promise<void> {
  await writeCachedBody(key(source), cursor);
}

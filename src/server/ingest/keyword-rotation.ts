import { readCatalogCursor, saveCatalogCursor } from "./catalog-rotation";
import { AI_QUERIES } from "@/lib/ai-topics";

/** Alternate AI and historical terms, rotating both lists after an interrupted run. */
export async function rotatedKeywords(source: string, legacy: readonly string[]): Promise<string[]> {
  const cursor = Number(await readCatalogCursor(`${source}:keywords`)) || 0;
  const ai = [...AI_QUERIES], other = legacy.filter((word) => !ai.includes(word as typeof AI_QUERIES[number]));
  const rotate = (list: readonly string[]) => list.length ? [...list.slice(cursor % list.length), ...list.slice(0, cursor % list.length)] : [];
  const left = rotate(ai), right = rotate(other), ordered: string[] = [];
  while (left.length || right.length) { if (left.length) ordered.push(left.shift()!); if (right.length) ordered.push(right.shift()!); }
  // Advance before network work: even a refused first query cannot pin all future cycles.
  await saveCatalogCursor(`${source}:keywords`, String(cursor + 1));
  return ordered;
}

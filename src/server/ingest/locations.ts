import { geocodeCityFull, geocodeCity } from "./sources/geocode";
import { publicUrl } from "./scope";

/** A Workday URL can name a municipality even when its location field names a campus. */
export function workdayCity(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/\.myworkdayjobs\.com$/.test(parsed.hostname)) return null;
    const value = decodeURIComponent(/\/job\/([^/]+)\//.exec(parsed.pathname)?.[1] ?? "").replace(/-/g, " ");
    return value && !/^(?:locations?|multiple|france|remote|toutes)/i.test(value) && !/\d/.test(value) ? value : null;
  } catch { return null; }
}

export async function resolveOfferCity(city: string, sourceUrl: string) {
  const direct = geocodeCity(city);
  if (direct) return { city, ...direct };
  const fallback = publicUrl(sourceUrl) ? workdayCity(sourceUrl) : null;
  if (fallback) {
    const geo = await geocodeCityFull(fallback);
    if (geo) return { city: fallback, ...geo };
  }
  const remote = await geocodeCityFull(city);
  return remote ? { city, ...remote } : null;
}

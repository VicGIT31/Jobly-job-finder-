import type { MetadataRoute } from "next";
import { getSettings, publicBaseUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * `robots.txt` piloté depuis `/admin/seo` : liste des chemins interdits et
 * interrupteur global d'indexation (fermeture complète en pré-production).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSettings("seo");
  const base = publicBaseUrl(seo);

  if (!seo.indexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const disallow = seo.robotsDisallow
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    rules: [{ userAgent: "*", allow: "/", ...(disallow.length > 0 ? { disallow } : {}) }],
    sitemap: `${base}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/go/", "/mon-espace", "/admin", "/api/", "/internal/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

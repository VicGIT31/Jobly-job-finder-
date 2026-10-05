import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings, publicBaseUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Domaine canonique éventuellement redéfini dans `/admin/seo`.
  const base = publicBaseUrl(await getSettings("seo"));

  const [offers, companies] = await Promise.all([
    prisma.jobOffer.findMany({
      where: PUBLIC_OFFER_WHERE,
      select: { slug: true, updatedAt: true },
    }),
    prisma.company.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/offres`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/entreprises`, changeFrequency: "daily", priority: 0.7 },
    ...offers.map((offer) => ({
      url: `${base}/offres/${offer.slug}`,
      lastModified: offer.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...companies.map((company) => ({
      url: `${base}/entreprises/${company.slug}`,
      lastModified: company.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

import type { Metadata } from "next";
import { searchOffers } from "@/server/search/query";
import { parseOfferSearchParams } from "@/lib/search-params";
import { PersonalSearch } from "@/components/offers/personal-search";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commerce, marketing & ASV", description: "Votre recherche personnelle d’emploi, à Toulouse et dans toute la France." };
export default async function OffresPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const input = parseOfferSearchParams({ tri: "pertinence", ...params });
  const initialQuery = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : [])).toString();
  const initialResult = await searchOffers(input);
  return <div className="container-page pb-12 pt-8 sm:pt-12"><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Votre recherche · sans compte</p><h1 className="mt-3 text-display-sm font-semibold">Le prochain <span className="serif-accent text-accent">bon poste.</span></h1></div><p className="max-w-sm text-sm leading-relaxed text-ink/65">Commerce, marketing ou auxiliaire vétérinaire. Des offres réelles, leurs sources et vos favoris, au même endroit.</p></header><PersonalSearch initialResult={initialResult} initialQuery={initialQuery} /></div>;
}

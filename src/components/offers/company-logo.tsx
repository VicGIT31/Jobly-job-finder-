"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND_LOGOS } from "@/components/companies/logo-registry";

// Teintes douces pour les monogrammes : stables pour une même entreprise.
const MONO_TONES = [
  "bg-[#EDEBFF] text-[#3B2BD9] dark:bg-[#211D45] dark:text-[#B4ADFF]",
  "bg-[#FFEDE4] text-[#B4410F] dark:bg-[#3A1B0E] dark:text-[#FF9A6C]",
  "bg-[#E4F6EA] text-[#17703C] dark:bg-[#0D2E1A] dark:text-[#6EE09A]",
  "bg-[#FFF4D6] text-[#8A5A00] dark:bg-[#33270A] dark:text-[#F5C451]",
  "bg-[#E6F1FB] text-[#1D5C99] dark:bg-[#0E2235] dark:text-[#7DB8EE]",
  "bg-[#F6E8F7] text-[#8B2A91] dark:bg-[#2E1430] dark:text-[#E19BE6]",
];

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return MONO_TONES[Math.abs(hash) % MONO_TONES.length];
}

function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Logo d'entreprise, résilient :
 * 1. `logoUrl` de l'ingestion — seulement s'il est absolu (les chemins
 *    relatifs hérités, sans hôte connu, aboutiraient à un 404 chez Jobly) ;
 * 2. logo vérifié du registre (`logo-registry.ts`), par slug ;
 * 3. icône du site officiel connu (`website`), via le service de favicons ;
 * 4. monogramme teinté (initiale de l'entreprise).
 * Chaque source qui échoue — erreur réseau ou image trop petite pour être
 * nette — passe la main à la suivante ; jamais d'image cassée.
 */
export function CompanyLogo({
  name,
  logoUrl,
  slug,
  website,
  size = 44,
}: {
  name: string;
  logoUrl: string | null;
  slug?: string | null;
  website?: string | null;
  size?: number;
}) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (logoUrl && /^https?:\/\//.test(logoUrl)) list.push(logoUrl);
    const brand = slug ? BRAND_LOGOS[slug] : undefined;
    if (brand) {
      list.push(brand.src);
      if (brand.fallback) list.push(brand.fallback);
    }
    const domain = domainOf(website);
    if (domain && domain !== brand?.domain) {
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    }
    return list;
  }, [logoUrl, slug, website]);

  const [index, setIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const current = sources[index];

  useEffect(() => setIndex(0), [sources]);

  // Une image en erreur avant l'hydratation ne déclenche jamais `onError` :
  // on vérifie son état au montage pour passer à la source suivante.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth < 32) setIndex((i) => i + 1);
  }, [index]);

  const radius = size >= 40 ? "rounded-[10px]" : "rounded-md";

  if (!current) {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 select-none items-center justify-center font-semibold tracking-tight ${radius} ${toneFor(name)}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- domaines externes variés, next/image inadapté
    <img
      ref={imgRef}
      key={current}
      src={current}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth < 32) setIndex((i) => i + 1);
      }}
      onError={() => setIndex((i) => i + 1)}
      className={`shrink-0 border border-line bg-white object-contain p-1 ${radius}`}
      style={{ width: size, height: size }}
    />
  );
}

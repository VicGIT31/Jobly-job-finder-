"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CompanyLogo } from "@/components/offers/company-logo";

export type CollectionTab = {
  key: string;
  label: string;
  tagline: string;
  icon: string;
  totalOffers: number;
  companies: Array<{ slug: string; name: string; logoUrl: string | null; offerCount: number }>;
};

/**
 * Vitrines d'entreprises en onglets (Big Tech, licornes…) — une seule section
 * au lieu d'une pile de grilles répétitives. Onglets ARIA + flèches clavier.
 */
export function CollectionTabs({ collections }: { collections: CollectionTab[] }) {
  const [activeKey, setActiveKey] = useState(collections[0]?.key);
  const active = collections.find((c) => c.key === activeKey) ?? collections[0];
  if (!active) return null;

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      (index + (e.key === "ArrowRight" ? 1 : -1) + collections.length) % collections.length;
    setActiveKey(collections[next].key);
    document.getElementById(`tab-${collections[next].key}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Catégories d'entreprises"
        className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {collections.map((c, i) => {
          const selected = c.key === active.key;
          return (
            <button
              key={c.key}
              id={`tab-${c.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${c.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveKey(c.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color] duration-base ease-out ${
                selected ? "bg-ink text-canvas" : "text-ink/60 hover:bg-ink/[0.05] hover:text-ink"
              }`}
            >
              <span aria-hidden="true">{c.icon}</span>
              <span>{c.label}</span>
              <span
                className={`font-mono text-2xs tabular-nums ${selected ? "text-canvas/60" : "text-ink/60"}`}
              >
                {c.totalOffers}
              </span>
            </button>
          );
        })}
      </div>

      {/* `key` : le panneau est remonté à chaque onglet et rejoue son entrée CSS. */}
      <div
        key={active.key}
        id={`panel-${active.key}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.key}`}
        className="mt-6 animate-[fade-up_320ms_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        <p className="text-sm text-ink/60">{active.tagline}</p>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {active.companies.slice(0, 8).map((company) => (
            <li key={company.slug}>
              <Link
                href={`/entreprises/${company.slug}`}
                className="card-interactive group flex items-center gap-3 p-3.5"
              >
                <CompanyLogo
                  name={company.name}
                  logoUrl={company.logoUrl}
                  slug={company.slug}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{company.name}</span>
                  <span className="font-mono text-2xs text-ink/60">
                    {company.offerCount} offre{company.offerCount > 1 ? "s" : ""}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  size={16}
                  className="shrink-0 text-ink/25 transition-all duration-base ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation du panneau. Client Component uniquement pour surligner l'onglet
 * courant : sur une console à huit sections, savoir où l'on est compte.
 */
const TABS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/offres", label: "Offres" },
  { href: "/admin/entreprises", label: "Entreprises" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/sources", label: "Sources & ingestion" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/parametres", label: "Paramètres" },
  { href: "/admin/journal", label: "Journal" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation admin"
      className="rule mt-4 flex flex-wrap gap-1 overflow-x-auto pt-3"
    >
      {TABS.map((tab) => {
        // `/admin` ne doit pas s'allumer sur `/admin/offres` : égalité stricte
        // pour la racine, préfixe pour les sous-sections.
        const active =
          tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-cobalt text-white" : "text-ink/70 hover:bg-surface hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

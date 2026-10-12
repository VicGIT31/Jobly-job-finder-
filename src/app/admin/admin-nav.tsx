"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
import { SPRING } from "@/components/motion/tokens";
import { MotionProvider } from "@/components/motion/motion-provider";

/**
 * Navigation du panneau. Client Component uniquement pour surligner l'onglet
 * courant : sur une console à huit sections, savoir où l'on est compte.
 * Soulignement actif animé (pastille partagée qui glisse d'onglet en onglet).
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
    <MotionProvider>
      <nav aria-label="Navigation admin" className="mt-6 border-b border-line">
        <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            // `/admin` ne doit pas s'allumer sur `/admin/offres` : égalité stricte
            // pour la racine, préfixe pour les sous-sections.
            const active =
              tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href} className="relative shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-md px-3 pb-3 pt-2 text-sm font-medium transition-colors duration-base ${
                    active ? "text-ink" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
                {active && (
                  <m.span
                    layoutId="admin-tab-indicator"
                    transition={SPRING.snappy}
                    aria-hidden="true"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionProvider>
  );
}

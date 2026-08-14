"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  EyeOff,
  MousePointerClick,
  Shield,
  User,
} from "lucide-react";

const ITEMS = [
  { href: "/mon-espace", label: "Profil & CV", icon: User, exact: true },
  { href: "/mon-espace/candidatures", label: "Candidatures", icon: Briefcase, exact: false },
  { href: "/mon-espace/sauvegardees", label: "Sauvegardées", icon: Bookmark, exact: false },
  { href: "/mon-espace/masquees", label: "Masquées", icon: EyeOff, exact: false },
  { href: "/mon-espace/insights", label: "Insights", icon: BarChart3, exact: false },
  { href: "/mon-espace/alertes", label: "Alertes", icon: Bell, exact: false },
  { href: "/mon-espace/clics", label: "Historique", icon: MousePointerClick, exact: false },
  { href: "/mon-espace/confidentialite", label: "Confidentialité", icon: Shield, exact: false },
] as const;

/**
 * Nav icônes + libellés (spec §4) avec indicateur de page active — absent
 * jusqu'ici (8 liens texte plats, aucun moyen de savoir où l'on se trouve).
 * Composant client uniquement pour `usePathname()` ; le layout parent reste
 * un Server Component pour la garde d'accès.
 */
export function MonEspaceNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation de l'espace candidat"
      className="rule mt-4 flex flex-wrap gap-1 overflow-x-auto pt-3"
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-cobalt text-white" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2.25} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
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
import { SPRING } from "@/components/motion/tokens";
import { MotionProvider } from "@/components/motion/motion-provider";

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
 * Nav de l'espace candidat : barre latérale collante sur grand écran, barre
 * d'onglets défilante sur mobile. La pastille active glisse d'un lien à
 * l'autre (`layoutId`). Composant client uniquement pour `usePathname()` ;
 * le layout parent reste un Server Component pour la garde d'accès.
 */
export function MonEspaceNav() {
  const pathname = usePathname();

  return (
    <MotionProvider>
      <nav aria-label="Navigation de l'espace candidat" className="lg:self-start">
        <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-3 sm:-mx-6 sm:px-6 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:mx-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0">
          {ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname?.startsWith(href);
            return (
              <li key={href} className="relative shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative z-10 flex min-h-[40px] items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-base ${
                    active ? "text-canvas" : "text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className={active ? "text-volt" : "text-ink/60"}
                  />
                  {label}
                </Link>
                {active && (
                  <m.span
                    layoutId="mon-espace-pill"
                    transition={SPRING.snappy}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-lg bg-ink"
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

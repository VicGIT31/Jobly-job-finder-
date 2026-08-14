"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/offres", label: "Offres" },
  { href: "/entreprises", label: "Entreprises" },
] as const;

/**
 * Nav principale du header — jusqu'ici liens texte plats sans indicateur de
 * page active (même trou UX que `mon-espace-nav.tsx` avant sa refonte) et
 * sans menu mobile : `flex` sans `flex-wrap` ni repli, les liens débordaient
 * simplement sur petit écran. Composant client pour `usePathname()` + l'état
 * du menu mobile ; `SiteHeader` reste un Server Component pour `auth()`.
 */
export function SiteNav({ isAdmin, isLoggedIn }: { isAdmin: boolean; isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];

  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-cobalt text-white" : "text-ink/70 hover:bg-surface hover:text-ink"
    }`;

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="hidden items-center gap-1 sm:flex sm:gap-2"
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={linkClass(isActive(href))}
          >
            {label}
          </Link>
        ))}
        <ThemeToggle />
        {isLoggedIn ? (
          <Link href="/mon-espace" className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm">
            Mon espace
          </Link>
        ) : (
          <Link href="/connexion" className="btn-cobalt !min-h-[40px] !px-4 !py-1.5 text-sm">
            Connexion
          </Link>
        )}
      </nav>

      <button
        type="button"
        className="rounded-lg p-2 text-ink/70 hover:bg-surface sm:hidden"
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
      </button>

      {open && (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full border-b border-ink/10 bg-paper p-3 shadow-lift sm:hidden"
        >
          <nav aria-label="Navigation principale (mobile)" className="flex flex-col gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={linkClass(isActive(href))}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-ink/70">Thème</span>
              <ThemeToggle />
            </div>
            {isLoggedIn ? (
              <Link
                href="/mon-espace"
                className="btn-outline mt-1 !min-h-[40px] text-sm"
                onClick={() => setOpen(false)}
              >
                Mon espace
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="btn-cobalt mt-1 !min-h-[40px] text-sm"
                onClick={() => setOpen(false)}
              >
                Connexion
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

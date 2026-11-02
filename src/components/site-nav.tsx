"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandMenu } from "@/components/command-menu";

const LINKS = [
  { href: "/offres", label: "Offres" },
  { href: "/entreprises", label: "Entreprises" },
] as const;

/**
 * Nav principale. Composant client pour `usePathname()` et le menu mobile ;
 * `SiteHeader` reste un Server Component pour `auth()`. Animations en CSS pur :
 * l'en-tête est sur toutes les pages, il ne doit pas embarquer de moteur
 * d'animation JS.
 */
export function SiteNav({
  isAdmin,
  isLoggedIn,
  userName,
}: {
  isAdmin: boolean;
  isLoggedIn: boolean;
  userName: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [...LINKS, ...(isAdmin ? [{ href: "/bureau", label: "Actualisation" }] : [])];
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  // Ferme le menu mobile à chaque navigation et sur Échap ; bloque le défilement dessous.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = (userName ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="hidden flex-1 items-center justify-center lg:flex"
      >
        <ul className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative block rounded-lg px-3.5 py-2 text-sm font-medium transition-[background-color,color] duration-base ease-out after:absolute after:-bottom-[3px] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-accent after:transition-transform after:duration-slow after:ease-spring ${
                    active
                      ? "bg-ink/[0.06] text-ink after:scale-100"
                      : "text-ink/60 after:scale-0 hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <CommandMenu />
        <ThemeToggle className="hidden sm:grid" />
        {isLoggedIn ? (
          <Link
            href="/mon-espace"
            className="hidden items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-sm font-medium shadow-card transition-colors hover:border-ink/25 lg:inline-flex"
          >
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-ink font-mono text-2xs font-semibold text-canvas"
            >
              {initials || "?"}
            </span>
            Mon espace
          </Link>
        ) : (
          <Link href="/connexion" className="btn-cobalt btn-sm hidden lg:inline-flex">
            Connexion
          </Link>
        )}

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink/80 hover:bg-ink/[0.06] lg:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
      </div>

      {/* Menu mobile : toujours monté, ouvert/fermé par transitions CSS. */}
      <div
        id="menu-mobile"
        aria-hidden={!open}
        ref={(el) => {
          if (el) el.toggleAttribute("inert", !open);
        }}
        className={`fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-canvas transition-[opacity,visibility] duration-base ease-out lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav
          aria-label="Navigation principale (mobile)"
          className="container-page flex h-full flex-col pb-8 pt-6"
        >
          <ul className="flex flex-col">
            {links.map(({ href, label }, i) => (
              <li
                key={href}
                className={`border-b border-line transition-[opacity,transform] duration-slow ease-out ${
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
                style={{ transitionDelay: open ? `${40 * i}ms` : "0ms" }}
              >
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 text-3xl font-semibold tracking-tight"
                >
                  <span className={isActive(href) ? "text-ink" : "text-ink/70"}>{label}</span>
                  <ArrowUpRight aria-hidden="true" size={22} className="text-ink/30" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-2">
              <span className="text-sm font-medium text-ink/70">Apparence</span>
              <ThemeToggle />
            </div>
            {isLoggedIn ? (
              <Link
                href="/mon-espace"
                className="btn-outline w-full"
                onClick={() => setOpen(false)}
              >
                Mon espace
              </Link>
            ) : (
              <Link href="/connexion" className="btn-cobalt w-full" onClick={() => setOpen(false)}>
                Connexion
              </Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Building2, CornerDownLeft, MapPin, Search, User } from "lucide-react";
import {
  CONTRACT_LABELS,
  CONTRACT_TYPES,
  TOP_CITIES,
} from "@/lib/search-params";

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ReactNode;
};

const STATIC_ITEMS: Item[] = [
  ...[{ key: "COMMERCE", label: "Commerce & marketing" }, { key: "ASV", label: "Auxiliaires vétérinaires" }].map(({ key, label }) => ({ id: `universe-${key}`, group: "Univers", label, href: `/offres?univers=${key}`, icon: <Search aria-hidden="true" size={16} /> })),
  ...CONTRACT_TYPES.map((c) => ({
    id: `ct-${c}`,
    group: "Contrats",
    label: CONTRACT_LABELS[c],
    href: `/offres?contrat=${c}`,
    icon: (
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${c === "ALTERNANCE" ? "bg-alternance" : "bg-stage"}`}
      />
    ),
  })),
  ...TOP_CITIES.slice(0, 6).map((city) => ({
    id: `city-${city}`,
    group: "Villes",
    label: city,
    hint: "+ 30 km",
    href: `/offres?ville=${encodeURIComponent(city)}&rayon=30`,
    icon: <MapPin aria-hidden="true" size={16} />,
  })),
  {
    id: "page-entreprises",
    group: "Pages",
    label: "Entreprises qui recrutent",
    href: "/entreprises",
    icon: <Building2 aria-hidden="true" size={16} />,
  },
  {
    id: "page-espace",
    group: "Pages",
    label: "Mon espace",
    href: "/mon-espace",
    icon: <User aria-hidden="true" size={16} />,
  },
];

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Palette de recherche (⌘K / Ctrl+K) : tape un mot-clé pour lancer la
 * recherche d'offres existante, ou saute vers un filtre courant. Simple
 * raccourci de navigation — aucune donnée nouvelle n'est inventée.
 */
export function CommandMenu() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const listId = useId();

  const items = useMemo<Item[]>(() => {
    const q = normalize(query.trim());
    const filtered = q
      ? STATIC_ITEMS.filter((it) => normalize(`${it.label} ${it.group}`).includes(q))
      : STATIC_ITEMS;
    if (!query.trim()) return filtered;
    return [
      {
        id: "search",
        group: "Recherche",
        label: `Rechercher « ${query.trim()} »`,
        hint: "dans les offres",
        href: `/offres?q=${encodeURIComponent(query.trim())}`,
        icon: <Search aria-hidden="true" size={16} />,
      },
      ...filtered,
    ];
  }, [query]);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
    setQuery("");
  }, []);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) close();
        else open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => setActive(0), [query]);

  function go(item: Item | undefined) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group hidden h-9 items-center gap-2 rounded-lg border border-line bg-paper pl-2.5 pr-1.5 text-[13px] text-ink/60 shadow-card transition-colors hover:border-ink/25 hover:text-ink/80 md:inline-flex"
        aria-haspopup="dialog"
      >
        <Search aria-hidden="true" size={15} />
        <span className="w-28 text-left lg:w-40">Rechercher…</span>
        <span className="kbd">{isMac ? "⌘" : "Ctrl"}</span>
        <span className="kbd -ml-1.5">K</span>
      </button>
      <button
        type="button"
        onClick={open}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink/70 hover:bg-ink/[0.06] md:hidden"
        aria-label="Rechercher"
        aria-haspopup="dialog"
      >
        <Search aria-hidden="true" size={18} />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Recherche rapide"
        onClose={() => setQuery("")}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="command-dialog m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-line bg-paper p-0 text-ink shadow-pop backdrop:bg-canvas/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden="true" size={18} className="shrink-0 text-ink/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(items[active]);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
            placeholder="Un métier, une techno, une entreprise…"
            className="h-14 w-full bg-transparent text-base placeholder:text-ink/50 focus:outline-none"
          />
          <button type="button" onClick={close} className="kbd shrink-0" aria-label="Fermer">
            Esc
          </button>
        </div>
        <ul id={listId} role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {header && (
                  <p className="eyebrow px-2.5 pb-1.5 pt-3 first:pt-1" role="presentation">
                    {header}
                  </p>
                )}
                <div
                  id={`${listId}-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors duration-fast ${
                    i === active ? "bg-ink/[0.06] text-ink" : "text-ink/75"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-surface/60 text-ink/70">
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate font-medium">{item.label}</span>
                  {item.hint && <span className="text-xs text-ink/60">{item.hint}</span>}
                  {i === active ? (
                    <CornerDownLeft aria-hidden="true" size={14} className="text-ink/45" />
                  ) : (
                    <ArrowRight aria-hidden="true" size={14} className="text-transparent" />
                  )}
                </div>
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-ink/60">Aucun raccourci.</li>
          )}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface/40 px-4 py-2.5 text-xs text-ink/60">
          <span className="flex items-center gap-1.5">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="kbd">↵</span> ouvrir
          </span>
        </div>
      </dialog>
    </>
  );
}

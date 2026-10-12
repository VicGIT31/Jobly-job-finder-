"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type CitySuggestion = { city: string; count: number };

/**
 * Champ ville avec suggestions (`/api/villes`). Variante `bare` : sans
 * bordure, pour s'intégrer dans une barre de recherche composée.
 */
export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Ville",
  variant = "default",
  id,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  variant?: "default" | "bare";
  id?: string;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setInput(value), [value]);

  const { data: suggestions = [] } = useQuery<CitySuggestion[]>({
    queryKey: ["villes", input],
    queryFn: async () => {
      const res = await fetch(`/api/villes?q=${encodeURIComponent(input)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(city: string) {
    setInput(city);
    onChange(city);
    setOpen(false);
    setActiveIndex(-1);
  }

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <MapPin
        aria-hidden="true"
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-label="Ville"
        autoComplete="off"
        className={
          variant === "bare"
            ? "h-full min-h-[48px] w-full rounded-[10px] bg-transparent pl-10 pr-3 text-[15px] text-ink placeholder:text-ink/50 focus:outline-none"
            : "input-ink !pl-10"
        }
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (e.target.value === "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
            e.preventDefault();
            select(suggestions[activeIndex].city);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter") {
            onChange(input);
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-72 min-w-[220px] origin-top animate-[page-in_180ms_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto rounded-xl border border-line bg-paper p-1.5 shadow-pop"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.city}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(s.city)}
              onMouseMove={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-fast ${
                i === activeIndex ? "bg-ink/[0.06]" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin aria-hidden="true" size={14} className="text-ink/35" />
                {s.city}
              </span>
              <span className="font-mono text-2xs tabular-nums text-ink/60">{s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

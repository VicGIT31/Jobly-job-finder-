"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";

type CitySuggestion = { city: string; count: number };

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Ville",
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
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

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label="Ville"
        className="input-ink"
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
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
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full border border-ink bg-paper shadow-hard-sm"
        >
          {suggestions.map((s, i) => (
            <li key={s.city} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-signal hover:text-[#141414] ${
                  i === activeIndex ? "bg-signal text-[#141414]" : ""
                }`}
                onClick={() => select(s.city)}
              >
                <span>{s.city}</span>
                <span className="text-xs text-ink/50">{s.count} offres</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

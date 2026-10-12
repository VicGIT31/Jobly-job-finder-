"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Bascule clair/sombre — persistée en localStorage, initialisée par le script anti-FOUC du layout. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`group relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink ${className}`}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
    >
      <Sun
        aria-hidden="true"
        size={17}
        className={`absolute transition-all duration-slow ease-out ${
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      />
      <Moon
        aria-hidden="true"
        size={17}
        className={`absolute transition-all duration-slow ease-out ${
          dark === false ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
        }`}
      />
    </button>
  );
}

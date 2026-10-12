"use client";

import { useEffect, useState } from "react";

/**
 * En-tête collant : transparent en haut de page, il prend un fond flouté et
 * une bordure dès que l'on défile — la hiérarchie apparaît quand elle sert.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-slow ease-out ${
        scrolled
          ? "border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-canvas"
      }`}
    >
      {children}
    </header>
  );
}

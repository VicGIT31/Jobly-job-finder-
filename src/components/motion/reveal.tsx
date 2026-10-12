"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";

/**
 * Apparitions au défilement — IntersectionObserver + transitions CSS (voir
 * `[data-reveal]` dans globals.css). Sans JavaScript, tout reste visible : le
 * masquage initial n'est appliqué que sous `html.js`.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown };
}

type Tag = "div" | "section" | "ul" | "li";

export function Reveal({
  children,
  className,
  delay = 0,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Délai en secondes. */
  delay?: number;
  as?: Tag;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <Component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      data-reveal=""
      data-revealed={shown ? "" : undefined}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Component>
  );
}

/** Conteneur qui révèle ses `StaggerItem` en cascade (index → délai CSS). */
export function Stagger({
  children,
  className,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  let index = 0;
  return (
    <Component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      data-stagger=""
      data-revealed={shown ? "" : undefined}
    >
      {Children.map(children, (child) =>
        isValidElement<{ index?: number }>(child)
          ? cloneElement(child, { index: Math.min(index++, 10) })
          : child,
      )}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  index = 0,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  as?: "div" | "li";
}) {
  return (
    <Component
      className={className}
      data-stagger-item=""
      style={{ "--i": index } as React.CSSProperties}
    >
      {children}
    </Component>
  );
}

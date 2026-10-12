"use client";

import { useId } from "react";
import * as m from "motion/react-m";
import { SPRING } from "@/components/motion/tokens";
import { MotionProvider } from "@/components/motion/motion-provider";

/**
 * Contrôle segmenté avec indicateur glissant (pastille partagée `layoutId`).
 * Sémantique de groupe radio : une seule valeur active.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode }>;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <MotionProvider>
      <div
        role="radiogroup"
        aria-label={label}
        className="relative inline-flex items-center rounded-[10px] border border-line bg-surface/70 p-0.5"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-base ${
                size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm"
              } ${active ? "text-ink" : "text-ink/60 hover:text-ink"}`}
            >
              {active && (
                <m.span
                  layoutId={`seg-${id}`}
                  transition={SPRING.snappy}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg border border-line bg-paper shadow-card"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </MotionProvider>
  );
}

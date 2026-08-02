"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Identité de marque Jobly.
 *
 * Le monogramme est un « J » dont la hampe se termine par une flèche vers le
 * haut : la progression de carrière. Il est **interactif** — au survol / focus
 * le badge s'incline vers le pointeur (parallaxe 3D), la flèche décolle et un
 * halo de dégradé s'allume ; au clic il rebondit. Tout est désactivé par
 * `prefers-reduced-motion` (voir `globals.css`), et l'inclinaison n'est calculée
 * que sur pointeur fin (souris) pour ne pas gêner le tactile.
 */

type LogoSize = "sm" | "md" | "lg";

const MARK_SIZE: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-14 w-14",
};

const TEXT_SIZE: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl sm:text-4xl",
};

/** Inclinaison maximale du badge, en degrés. */
const MAX_TILT = 10;

/**
 * Le monogramme seul (badge + « J »-flèche). Utilisable hors du wordmark :
 * avatar admin, favicon, image Open Graph, écran de chargement.
 */
export function JoblyMark({
  size = "md",
  className = "",
  animated = true,
}: {
  size?: LogoSize;
  className?: string;
  animated?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);

  const handleMove = useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      if (!animated || event.pointerType !== "mouse") return;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      // Position du pointeur ramenée dans [-0.5, 0.5] sur chaque axe.
      const px = (event.clientX - box.left) / box.width - 0.5;
      const py = (event.clientY - box.top) / box.height - 0.5;
      setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 });
    },
    [animated],
  );

  const reset = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setPressed(false);
  }, []);

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      className={`jobly-mark group/mark relative inline-grid shrink-0 place-items-center ${MARK_SIZE[size]} ${className}`}
      style={{ perspective: "220px" }}
    >
      <svg
        viewBox="0 0 32 32"
        role="presentation"
        aria-hidden="true"
        className="h-full w-full drop-shadow-[0_2px_6px_rgb(79_70_229/0.35)] transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${pressed ? 0.92 : 1})`,
        }}
      >
        <defs>
          <linearGradient id="jobly-badge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="55%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="jobly-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Badge */}
        <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#jobly-badge)" />
        <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#jobly-gloss)" />

        {/* Trace fantôme : la flèche « déjà partie », révélée au survol */}
        <g className="jobly-ghost" fill="none" stroke="#FFFFFF" strokeOpacity="0.45">
          <path
            d="M12.4 12.6 L18 7 L23.6 12.6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Le « J » : hampe verticale + crochet */}
        <g
          className="jobly-glyph"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 10 V18.4 A4.6 4.6 0 1 1 8.8 18.4" />
          {/* Pointe de flèche qui coiffe la hampe */}
          <path className="jobly-arrow" d="M13.4 13 L18 8.4 L22.6 13" />
        </g>
      </svg>
    </span>
  );
}

/**
 * Le logo complet : monogramme + wordmark « Jobly ». Le point final reprend le
 * rôle d'accent de la marque et s'anime en même temps que le badge.
 */
export function JoblyLogo({
  size = "md",
  withMark = true,
  className = "",
}: {
  size?: LogoSize;
  withMark?: boolean;
  className?: string;
}) {
  return (
    <span className={`jobly-logo group/logo inline-flex items-center gap-2 ${className}`}>
      {withMark && <JoblyMark size={size} />}
      <span
        className={`font-display font-bold leading-none tracking-tight ${TEXT_SIZE[size]}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        {"Jobly".split("").map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="jobly-letter inline-block"
            style={{ transitionDelay: `${index * 28}ms` }}
          >
            {letter}
          </span>
        ))}
        <span className="jobly-dot text-cobalt">.</span>
      </span>
    </span>
  );
}

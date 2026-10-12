/**
 * Jetons de mouvement Jobly — mêmes valeurs que les utilitaires Tailwind
 * (`ease-out`, `duration-base`…) pour que CSS et JS parlent la même langue.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.36,
  reveal: 0.64,
} as const;

/** Ressorts : `snappy` pour indicateurs et puces, `soft` pour panneaux. */
export const SPRING = {
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.7 },
  soft: { type: "spring", stiffness: 300, damping: 34, mass: 0.9 },
} as const;

export const STAGGER = 0.045;

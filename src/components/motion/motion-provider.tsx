"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * Racine locale du système de mouvement — montée par les seuls composants
 * qui animent en JS (pas à la racine de l'app : les pages statiques ne
 * chargent ainsi aucun moteur d'animation). Les instances imbriquées sont
 * sans coût notable.
 * Racine du système de mouvement : fonctionnalités chargées en différé et
 * respect automatique de `prefers-reduced-motion` (les transformations sont
 * coupées, seules les opacités restent).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

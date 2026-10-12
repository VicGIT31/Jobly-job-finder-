import type { Config } from "tailwindcss";

/**
 * Système de design Jobly « Signal » — toutes les couleurs passent par des
 * variables CSS (voir `globals.css`) pour basculer clair/sombre sans dupliquer
 * les classes. Les anciens noms (`cobalt`, `brand`, `signal`) restent des alias
 * du nouvel accent : l'admin et les pages secondaires suivent automatiquement.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: rgb("canvas"),
        paper: rgb("paper"),
        surface: rgb("surface"),
        ink: rgb("ink"),
        line: rgb("line"),
        // Accent interactif : outremer électrique (liens, focus, sélection).
        cobalt: {
          DEFAULT: rgb("accent"),
          dark: rgb("accent-strong"),
          soft: rgb("accent-soft"),
        },
        accent: {
          DEFAULT: rgb("accent"),
          strong: rgb("accent-strong"),
          soft: rgb("accent-soft"),
          fg: rgb("accent-fg"),
        },
        // Signature : vert « volt », réservé aux marqueurs (nouveau, actif, logo).
        volt: {
          DEFAULT: rgb("volt"),
          ink: rgb("volt-ink"),
        },
        // Typage des contrats : stage = outremer, alternance = corail.
        stage: { DEFAULT: rgb("stage"), soft: rgb("stage-soft") },
        alternance: { DEFAULT: rgb("alternance"), soft: rgb("alternance-soft") },
        success: { DEFAULT: rgb("success"), soft: rgb("success-soft") },
        warning: { DEFAULT: rgb("warning"), soft: rgb("warning-soft") },
        danger: { DEFAULT: rgb("danger"), soft: rgb("danger-soft") },
        brand: {
          DEFAULT: rgb("accent"),
          light: rgb("accent"),
          violet: rgb("accent-strong"),
          ink: rgb("ink"),
        },
        signal: rgb("accent-soft"),
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        "display-sm": [
          "clamp(2rem, 1.4rem + 2.4vw, 3rem)",
          { lineHeight: "1.02", letterSpacing: "-0.035em" },
        ],
        "display-md": [
          "clamp(2.5rem, 1.6rem + 3.6vw, 4.25rem)",
          { lineHeight: "0.98", letterSpacing: "-0.045em" },
        ],
        "display-lg": [
          "clamp(2.85rem, 1.6rem + 5.6vw, 6.25rem)",
          { lineHeight: "0.92", letterSpacing: "-0.055em" },
        ],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgb(var(--shadow) / 0.04), 0 1px 2px -1px rgb(var(--shadow) / 0.06)",
        lift: "0 1px 0 0 rgb(var(--shadow) / 0.04), 0 12px 32px -12px rgb(var(--shadow) / 0.18), 0 4px 10px -6px rgb(var(--shadow) / 0.08)",
        pop: "0 24px 64px -16px rgb(var(--shadow) / 0.28), 0 8px 20px -8px rgb(var(--shadow) / 0.12)",
        ring: "0 0 0 4px rgb(var(--accent) / 0.16)",
        hard: "0 12px 32px -12px rgb(var(--shadow) / 0.18)",
        "hard-sm": "0 1px 2px -1px rgb(var(--shadow) / 0.06)",
        "hard-cobalt": "0 10px 30px -10px rgb(var(--accent) / 0.45)",
        brand: "0 10px 30px -10px rgb(var(--accent) / 0.45)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-strong)) 100%)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        DEFAULT: "160ms",
        fast: "120ms",
        base: "200ms",
        slow: "360ms",
      },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        // Opacité seule : une transformation sur l'enveloppe de page deviendrait
        // le bloc conteneur des éléments `position: fixed` (barres, tiroirs).
        "page-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // Sans opacité : l'élément compte comme peint dès le premier rendu (LCP).
        rise: {
          from: { transform: "translateY(12px)" },
          to: { transform: "none" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "page-in": "page-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "page-fade": "page-fade 360ms cubic-bezier(0.16, 1, 0.3, 1) both",
        rise: "rise 720ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up": "fade-up 640ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        marquee: "marquee 48s linear infinite",
        "pulse-dot": "pulse-dot 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;

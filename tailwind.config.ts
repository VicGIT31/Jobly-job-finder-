import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        // Accent unique du design sobre : indigo profond.
        cobalt: {
          DEFAULT: "#4F46E5",
          dark: "#4338CA",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
        },
        // Palette de marque Jobly : l'indigo du monogramme et le violet qui
        // ferme son dégradé (badge, image OG, boutons d'accent).
        brand: {
          DEFAULT: "#4F46E5",
          light: "#6366F1",
          violet: "#7C3AED",
          ink: "#312E81",
        },
        // Ancien jaune "signal" recyclé en teinte d'appui discrète.
        signal: "#EEF2FF",
        surface: "rgb(var(--surface) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        lift: "0 4px 16px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        // Alias historiques ("Ink & Signal") conservés pour compat : adoucis.
        hard: "0 4px 16px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        "hard-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "hard-cobalt": "0 4px 16px -2px rgb(79 70 229 / 0.25)",
        brand: "0 8px 24px -6px rgb(79 70 229 / 0.45)",
      },
      backgroundImage: {
        // Dégradé signature du badge Jobly, réutilisable en fond de section.
        "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #4F46E5 55%, #7C3AED 100%)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};
export default config;

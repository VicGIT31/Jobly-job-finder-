import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        cobalt: {
          DEFAULT: "#2743F0",
          dark: "#1D33C4",
        },
        signal: "#FFD84D",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
        full: "9999px",
      },
      boxShadow: {
        hard: "4px 4px 0 0 rgb(var(--ink))",
        "hard-sm": "2px 2px 0 0 rgb(var(--ink))",
        "hard-cobalt": "4px 4px 0 0 #2743F0",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Honey ground, pine ink: the palette of a warm kitchen, not a chart.
        honey: { DEFAULT: "#E9C87C", deep: "#DDB863" },
        pine: { DEFAULT: "#1F4E4A", soft: "#35706A" },
        porcelain: "#FBF8F1",
        // Coral is spent only on one thing: going past the goal.
        coral: { DEFAULT: "#D9483B", light: "#E9705F" },
        sage: "#9CB89A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Trebuchet MS", "sans-serif"],
        body: ["var(--font-body)", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Segoe UI", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.11em",
      },
    },
  },
  plugins: [],
};

export default config;

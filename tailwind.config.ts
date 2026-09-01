import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#211F1B",
        paper: "#EDEAE2",
        panel: "#FFFFFF",
        line: "#DBD5C6",
        blueprint: "#1D4E89",
        chantier: "#E1601F",
        ok: "#4E7A4E",
        warn: "#B33A2E",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

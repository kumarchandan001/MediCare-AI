import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#080C0B",
          secondary: "#0A0F0D",
          tertiary: "#0F1512",
        },
        surface: {
          1: "#0F1512",
          2: "#131A16",
          3: "#181F1B",
          4: "#1D2520",
          5: "#222A25",
          hover: "#1A2119",
        },
        accent: {
          primary: "#00F5C8",
          secondary: "#00D4A8",
          dark: "#00A882",
          glow: "rgba(0,245,200,0.15)",
          subtle: "rgba(0,245,200,0.06)",
          border: "rgba(0,245,200,0.20)",
        },
        health: {
          recovery: {
            DEFAULT: "#00E676",
            glow: "rgba(0,230,118,0.18)",
            bg: "rgba(0,230,118,0.08)",
            border: "rgba(0,230,118,0.15)",
          },
          strain: {
            DEFAULT: "#00B4FF",
            glow: "rgba(0,180,255,0.15)",
            bg: "rgba(0,180,255,0.08)",
            border: "rgba(0,180,255,0.15)",
          },
          sleep: {
            DEFAULT: "#9C6FFF",
            glow: "rgba(156,111,255,0.15)",
            bg: "rgba(156,111,255,0.08)",
            border: "rgba(156,111,255,0.15)",
          },
          warning: {
            DEFAULT: "#FFB300",
            glow: "rgba(255,179,0,0.15)",
            bg: "rgba(255,179,0,0.08)",
            border: "rgba(255,179,0,0.15)",
          },
          danger: {
            DEFAULT: "#FF3D5A",
            glow: "rgba(255,61,90,0.15)",
            bg: "rgba(255,61,90,0.08)",
            border: "rgba(255,61,90,0.15)",
          },
        },
        score: {
          excellent: "#00E676",
          good: "#69F0AE",
          moderate: "#FFB300",
          low: "#FF3D5A",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
        "3xl": "32px",
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "page-in": "page-in 320ms ease-out both",
        "pulse-dot": "pulse-dot 2s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

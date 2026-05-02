/**
 * CENTRALIZED THEME — Single source of truth
 * for ALL colors, fonts, spacing in the app.
 * Import this everywhere instead of hardcoding values.
 */

export const theme = {
  colors: {
    // ── Core Backgrounds ──────────────
    bg: {
      primary: "#080C0B",
      secondary: "#0A0F0D",
      tertiary: "#0F1512",
    },

    // ── Surface Colors (cards etc) ────
    surface: {
      1: "#0F1512",
      2: "#131A16",
      3: "#181F1B",
      4: "#1D2520",
      5: "#222A25",
      hover: "#1A2119",
    },

    // ── Brand Accent ──────────────────
    accent: {
      primary: "#00F5C8",
      secondary: "#00D4A8",
      dark: "#00A882",
      glow: "rgba(0,245,200,0.15)",
      subtle: "rgba(0,245,200,0.06)",
      border: "rgba(0,245,200,0.20)",
    },

    // ── Semantic Health Colors ─────────
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

    // ── Score Thresholds ──────────────
    score: {
      excellent: "#00E676", // 80-100
      good: "#69F0AE", // 66-79
      moderate: "#FFB300", // 33-65
      low: "#FF3D5A", // 0-32
    },

    // ── Text ──────────────────────────
    text: {
      primary: "rgba(255,255,255,1.00)",
      secondary: "rgba(255,255,255,0.82)",
      muted: "rgba(255,255,255,0.60)",
      subtle: "rgba(255,255,255,0.40)",
      disabled: "rgba(255,255,255,0.20)",
      accent: "#00F5C8",
    },

    // ── Borders ───────────────────────
    border: {
      1: "rgba(255,255,255,0.05)",
      2: "rgba(255,255,255,0.08)",
      3: "rgba(255,255,255,0.12)",
      focus: "rgba(0,245,200,0.50)",
    },
  },

  // ── Typography ─────────────────────
  typography: {
    fonts: {
      primary: "'Outfit', system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semi: 600,
      bold: 700,
      heavy: 800,
      black: 900,
    },
    sizes: {
      hero: "clamp(3rem,8vw,6rem)",
      display: "clamp(2rem,5vw,3.5rem)",
      h1: "clamp(1.5rem,3vw,2rem)",
      h2: "1.25rem",
      h3: "1rem",
      base: "0.9375rem",
      sm: "0.8125rem",
      xs: "0.6875rem",
      xxs: "0.625rem",
      metricXL: "clamp(3.5rem,8vw,5.5rem)",
      metricLG: "clamp(2.5rem,5vw,3.5rem)",
      metricMD: "clamp(1.5rem,3vw,2rem)",
    },
    label: {
      textTransform: "uppercase" as const,
      letterSpacing: "0.12em",
      fontWeight: 700,
      fontSize: "0.625rem",
    },
  },

  // ── Spacing ────────────────────────
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    7: "28px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },

  // ── Border Radius ──────────────────
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "18px",
    "2xl": "24px",
    "3xl": "32px",
    full: "9999px",
  },

  // ── Shadows / Glows ───────────────
  shadows: {
    card: "0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)",
    accent:
      "0 0 20px rgba(0,245,200,0.15), 0 0 60px rgba(0,245,200,0.05)",
    green:
      "0 0 20px rgba(0,230,118,0.20), 0 0 60px rgba(0,230,118,0.06)",
    blue: "0 0 20px rgba(0,180,255,0.20), 0 0 60px rgba(0,180,255,0.06)",
    purple:
      "0 0 20px rgba(156,111,255,0.20), 0 0 60px rgba(156,111,255,0.06)",
    red: "0 0 20px rgba(255,61,90,0.20), 0 0 60px rgba(255,61,90,0.06)",
  },

  // ── Animation ─────────────────────
  animation: {
    ease: "cubic-bezier(0.4,0,0.2,1)",
    easeBounce: "cubic-bezier(0.34,1.56,0.64,1)",
    easeOut: "cubic-bezier(0,0,0.2,1)",
    fast: "120ms",
    base: "200ms",
    slow: "320ms",
    ring: "1200ms",
  },

  // ── Layout ────────────────────────
  layout: {
    sidebarWidth: "260px",
    sidebarCollapsed: "68px",
    topbarHeight: "60px",
    bottomNavHeight: "68px",
    contentMax: "1440px",
  },
} as const;

// ── Helper: get score color ──────────
export function getScoreColor(score: number): string {
  if (score >= 80) return theme.colors.score.excellent;
  if (score >= 66) return theme.colors.score.good;
  if (score >= 33) return theme.colors.score.moderate;
  return theme.colors.score.low;
}

// ── Helper: get score label ──────────
export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 66) return "Good";
  if (score >= 33) return "Moderate";
  return "Low";
}

// ── Type export ──────────────────────
export type Theme = typeof theme;
export type HealthColor = keyof typeof theme.colors.health;

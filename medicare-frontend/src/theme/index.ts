/**
 * CENTRALIZED THEME SYSTEM — WORLD 2
 * Extends the existing theme with glassmorphism presets, gradients,
 * z-index layers, breakpoints, and responsive utilities.
 * Re-exports the original theme for backward compatibility.
 */

// Re-export original theme as base
export { theme, getScoreColor, getScoreLabel } from "@/config/theme";
export type { Theme, HealthColor } from "@/config/theme";

// ── Breakpoints ──────────────────────────
export const breakpoints = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
  "3xl": 1920,
} as const;

export const mediaQueries = {
  xs: `(max-width: ${breakpoints.xs}px)`,
  sm: `(max-width: ${breakpoints.sm}px)`,
  md: `(max-width: ${breakpoints.md}px)`,
  lg: `(max-width: ${breakpoints.lg}px)`,
  xl: `(max-width: ${breakpoints.xl}px)`,
  "2xl": `(max-width: ${breakpoints["2xl"]}px)`,
  "3xl": `(max-width: ${breakpoints["3xl"]}px)`,
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  ultrawide: `(min-width: ${breakpoints["3xl"]}px)`,
  touch: "(hover: none) and (pointer: coarse)",
  prefersReducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

// ── Z-Index Layering ─────────────────────
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  sidebar: 30,
  overlay: 40,
  drawer: 50,
  modal: 60,
  popover: 70,
  toast: 80,
  tooltip: 90,
  spotlight: 100,
} as const;

// ── Glassmorphism Presets ─────────────────
export const glass = {
  card: {
    background: "rgba(15, 21, 18, 0.70)",
    backdropFilter: "blur(16px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  panel: {
    background: "rgba(19, 26, 22, 0.80)",
    backdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  elevated: {
    background: "rgba(24, 31, 27, 0.85)",
    backdropFilter: "blur(32px) saturate(200%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  overlay: {
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(8px)",
  },
  sidebar: {
    background: "rgba(15, 21, 18, 0.92)",
    backdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
} as const;

// ── Gradient Presets ─────────────────────
export const gradients = {
  primary: "linear-gradient(135deg, #00F5C8 0%, #00D4A8 100%)",
  accent: "linear-gradient(135deg, rgba(0,245,200,0.15) 0%, rgba(0,212,168,0.05) 100%)",
  recovery: "linear-gradient(135deg, rgba(0,230,118,0.12) 0%, rgba(0,230,118,0.03) 100%)",
  strain: "linear-gradient(135deg, rgba(0,180,255,0.12) 0%, rgba(0,180,255,0.03) 100%)",
  sleep: "linear-gradient(135deg, rgba(156,111,255,0.12) 0%, rgba(156,111,255,0.03) 100%)",
  danger: "linear-gradient(135deg, rgba(255,61,90,0.12) 0%, rgba(255,61,90,0.03) 100%)",
  warning: "linear-gradient(135deg, rgba(255,179,0,0.12) 0%, rgba(255,179,0,0.03) 100%)",
  surface: "linear-gradient(180deg, #0F1512 0%, #0A0F0D 100%)",
  cardShine: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)",
  heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(0,245,200,0.08) 0%, transparent 60%)",
} as const;

// ── Card Variants ────────────────────────
export const cardVariants = {
  default: {
    background: "rgba(19, 26, 22, 1)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "14px",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)",
  },
  glass: {
    ...glass.card,
    borderRadius: "14px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  elevated: {
    background: "rgba(24, 31, 27, 1)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  interactive: {
    background: "rgba(19, 26, 22, 1)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "14px",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)",
    cursor: "pointer" as const,
    transition: "all 200ms cubic-bezier(0.4,0,0.2,1)",
  },
  accent: {
    background: "rgba(0, 245, 200, 0.04)",
    border: "1px solid rgba(0, 245, 200, 0.15)",
    borderRadius: "14px",
    boxShadow: "0 0 20px rgba(0,245,200,0.05)",
  },
} as const;

// ── Touch Targets ────────────────────────
export const touch = {
  minTarget: "44px",
  safeSpacing: "8px",
  buttonHeight: {
    sm: "36px",
    md: "44px",
    lg: "52px",
  },
} as const;

// ── Responsive Typography Scale ──────────
export const responsiveType = {
  hero: { mobile: "2rem", tablet: "3rem", desktop: "clamp(3rem,8vw,6rem)" },
  display: { mobile: "1.5rem", tablet: "2rem", desktop: "clamp(2rem,5vw,3.5rem)" },
  h1: { mobile: "1.25rem", tablet: "1.5rem", desktop: "clamp(1.5rem,3vw,2rem)" },
  h2: { mobile: "1.1rem", tablet: "1.2rem", desktop: "1.25rem" },
  h3: { mobile: "0.95rem", tablet: "1rem", desktop: "1rem" },
  body: { mobile: "0.875rem", tablet: "0.9375rem", desktop: "0.9375rem" },
  sm: { mobile: "0.75rem", tablet: "0.8125rem", desktop: "0.8125rem" },
} as const;

// ── Transition Presets ───────────────────
export const transitions = {
  fast: "all 120ms cubic-bezier(0.4,0,0.2,1)",
  base: "all 200ms cubic-bezier(0.4,0,0.2,1)",
  slow: "all 320ms cubic-bezier(0.4,0,0.2,1)",
  spring: "all 400ms cubic-bezier(0.34,1.56,0.64,1)",
  color: "color 200ms ease, background-color 200ms ease, border-color 200ms ease",
  transform: "transform 200ms cubic-bezier(0.4,0,0.2,1)",
} as const;

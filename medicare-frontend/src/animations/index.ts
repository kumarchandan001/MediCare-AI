/**
 * Framer Motion Animation Variants Library
 * Reusable, performance-optimized animation presets.
 * Uses reduced-motion detection for accessibility.
 */
import type { Variants, Transition } from "framer-motion";

// ── Detect reduced motion preference ─────
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const noMotion = { opacity: 1, x: 0, y: 0, scale: 1 };

// ── Transitions ──────────────────────────
export const springTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 25,
};

export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

export const fastTransition: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

export const slowTransition: Transition = {
  duration: 0.5,
  ease: [0, 0, 0.2, 1],
};

// ── Page Transitions ─────────────────────
export const pageVariants: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion, exit: noMotion }
  : {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0, 0, 0.2, 1] } },
      exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
    };

// ── Fade In ──────────────────────────────
export const fadeIn: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: smoothTransition },
    };

export const fadeInUp: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0, transition: smoothTransition },
    };

export const fadeInDown: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, y: -16 },
      animate: { opacity: 1, y: 0, transition: smoothTransition },
    };

export const fadeInLeft: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0, transition: smoothTransition },
    };

export const fadeInRight: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0, transition: smoothTransition },
    };

// ── Scale ────────────────────────────────
export const scaleIn: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, scale: 0.92 },
      animate: { opacity: 1, scale: 1, transition: springTransition },
    };

export const popIn: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 20 } },
    };

// ── Stagger Container ────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion }
  : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0, transition: smoothTransition },
    };

// ── Slide Drawer (Sidebar) ───────────────
export const slideDrawer: Variants = {
  initial: { x: "-100%" },
  animate: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", transition: { duration: 0.2 } },
};

// ── Bottom Sheet (Mobile Modals) ─────────
export const bottomSheet: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion, exit: noMotion }
  : {
      initial: { y: "100%" },
      animate: { y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
      exit: { y: "100%", transition: { duration: 0.25 } },
    };

// ── Modal ────────────────────────────────
export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: fastTransition },
  exit: { opacity: 0, transition: fastTransition },
};

export const modalContent: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion, exit: noMotion }
  : {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0, transition: springTransition },
      exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
    };

// ── Notification Toast ───────────────────
export const toastVariants: Variants = prefersReduced
  ? { initial: noMotion, animate: noMotion, exit: noMotion }
  : {
      initial: { opacity: 0, x: 50, scale: 0.95 },
      animate: { opacity: 1, x: 0, scale: 1, transition: springTransition },
      exit: { opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } },
    };

// ── Pulse (Live Indicators) ──────────────
export const pulseVariant: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.15, 1],
    opacity: [1, 0.7, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

// ── Hover/Tap Helpers ────────────────────
export const hoverScale = prefersReduced
  ? {}
  : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } };

export const hoverLift = prefersReduced
  ? {}
  : { whileHover: { y: -2 }, whileTap: { scale: 0.98 } };

export const hoverGlow = (color: string) =>
  prefersReduced
    ? {}
    : {
        whileHover: {
          boxShadow: `0 0 20px ${color}`,
          transition: smoothTransition,
        },
      };

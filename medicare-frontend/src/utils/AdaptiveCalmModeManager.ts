/**
 * AdaptiveCalmModeManager — Visual intensity interpolation utility
 *
 * Smoothly transitions the UI between visual intensity states based
 * on physiological context. When the user is stressed, burnt out,
 * or cognitively overloaded the platform softens its rendering:
 *   - reduced animation speeds
 *   - dimmed glow/accent opacity
 *   - lower chart density
 *   - calmer notification pacing
 *
 * Three states: STANDARD → SOFTENED → DEEP_CALM
 */

// ── Calm Level Enum ─────────────────────────
export enum CalmLevel {
  STANDARD = "standard",
  SOFTENED = "softened",
  DEEP_CALM = "deep_calm",
}

// ── Visual intensity parameters ─────────────
export interface CalmVisualParams {
  /** 0–1 multiplier on animation durations (1 = normal, higher = slower) */
  animationDuration: number;
  /** 0–1 opacity multiplier on glow / neon effects */
  glowOpacity: number;
  /** 0–1 opacity multiplier on accent highlights */
  accentIntensity: number;
  /** number of chart data points to show (density) */
  chartDensity: number;
  /** milliseconds between notification batches */
  notificationInterval: number;
  /** whether to suppress low-priority alerts entirely */
  suppressLowPriority: boolean;
  /** CSS filter to soften contrast */
  contrastFilter: string;
  /** transition CSS for smooth state change */
  transitionSpeed: string;
}

// ── Preset visual profiles ──────────────────
const VISUAL_PROFILES: Record<CalmLevel, CalmVisualParams> = {
  [CalmLevel.STANDARD]: {
    animationDuration: 1.0,
    glowOpacity: 1.0,
    accentIntensity: 1.0,
    chartDensity: 40,
    notificationInterval: 5000,
    suppressLowPriority: false,
    contrastFilter: "none",
    transitionSpeed: "0.3s ease",
  },
  [CalmLevel.SOFTENED]: {
    animationDuration: 1.4,
    glowOpacity: 0.55,
    accentIntensity: 0.7,
    chartDensity: 25,
    notificationInterval: 12000,
    suppressLowPriority: true,
    contrastFilter: "contrast(0.95) brightness(0.97)",
    transitionSpeed: "0.6s ease",
  },
  [CalmLevel.DEEP_CALM]: {
    animationDuration: 1.8,
    glowOpacity: 0.3,
    accentIntensity: 0.5,
    chartDensity: 15,
    notificationInterval: 30000,
    suppressLowPriority: true,
    contrastFilter: "contrast(0.9) brightness(0.94) saturate(0.85)",
    transitionSpeed: "1.0s ease",
  },
};

// ── Physiological input for calm determination ──
export interface PhysiologicalContext {
  stressLevel: number;        // 0–100
  burnoutRisk: number;        // 0–100
  cognitiveLoad: number;      // 0–1
  recoveryBandwidth: number;  // 0–1
  emotionalStrain: number;    // 0–1
}

/**
 * Determine the appropriate calm level from physiological context.
 * Uses a weighted composite score.
 */
export function determineCalmLevel(ctx: PhysiologicalContext): CalmLevel {
  const composite =
    ctx.stressLevel * 0.3 +
    ctx.burnoutRisk * 0.25 +
    ctx.cognitiveLoad * 100 * 0.2 +
    (1 - ctx.recoveryBandwidth) * 100 * 0.15 +
    ctx.emotionalStrain * 100 * 0.1;

  if (composite >= 65) return CalmLevel.DEEP_CALM;
  if (composite >= 40) return CalmLevel.SOFTENED;
  return CalmLevel.STANDARD;
}

/**
 * Get visual parameters for a given calm level.
 */
export function getCalmVisualParams(level: CalmLevel): CalmVisualParams {
  return VISUAL_PROFILES[level];
}

/**
 * Linearly interpolate between two CalmVisualParams.
 * Useful for smooth animated transitions between calm states.
 */
export function interpolateCalmParams(
  from: CalmVisualParams,
  to: CalmVisualParams,
  t: number, // 0–1
): CalmVisualParams {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    animationDuration: lerp(from.animationDuration, to.animationDuration),
    glowOpacity: lerp(from.glowOpacity, to.glowOpacity),
    accentIntensity: lerp(from.accentIntensity, to.accentIntensity),
    chartDensity: Math.round(lerp(from.chartDensity, to.chartDensity)),
    notificationInterval: Math.round(lerp(from.notificationInterval, to.notificationInterval)),
    suppressLowPriority: t > 0.5 ? to.suppressLowPriority : from.suppressLowPriority,
    contrastFilter: t > 0.5 ? to.contrastFilter : from.contrastFilter,
    transitionSpeed: t > 0.5 ? to.transitionSpeed : from.transitionSpeed,
  };
}

/**
 * Time-of-day softening factor (0–0.15).
 * Adds a gentle softening during late evening / early morning.
 */
export function getTimeOfDaySoftening(): number {
  const hour = new Date().getHours();
  // 10pm – 6am: gentle softening
  if (hour >= 22 || hour < 6) return 0.15;
  // 8pm – 10pm or 6am – 8am: slight softening
  if (hour >= 20 || hour < 8) return 0.07;
  return 0;
}

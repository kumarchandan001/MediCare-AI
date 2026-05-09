/**
 * useAdaptiveCalmMode — Hook providing calm-aware visual parameters
 *
 * Components consume this hook to adapt their rendering intensity
 * (animation speed, glow opacity, chart density, etc.) based on
 * the user's current physiological state.
 */
import { useContext } from "react";
import { CalmContext } from "@/contexts/CalmStateProvider";
import type { CalmVisualParams } from "@/utils/AdaptiveCalmModeManager";
import { CalmLevel } from "@/utils/AdaptiveCalmModeManager";

export interface CalmModeState {
  /** Current calm level */
  level: CalmLevel;
  /** Visual parameters for rendering */
  params: CalmVisualParams;
  /** Whether the UI is in any softened state */
  isSoftened: boolean;
  /** Whether deep calm mode is active */
  isDeepCalm: boolean;
  /** Scale a duration by the calm-mode multiplier */
  scaleDuration: (baseMs: number) => number;
  /** Scale an opacity by the calm-mode glow multiplier */
  scaleGlow: (baseOpacity: number) => number;
  /** Get chart density for current calm state */
  chartDensity: number;
}

/**
 * Primary hook for consuming calm-mode state.
 *
 * Usage:
 * ```tsx
 * const { isSoftened, scaleDuration, scaleGlow, chartDensity } = useAdaptiveCalmMode();
 * ```
 */
export function useAdaptiveCalmMode(): CalmModeState {
  const ctx = useContext(CalmContext);

  if (!ctx) {
    // Fallback: standard mode if no provider is present
    return {
      level: CalmLevel.STANDARD,
      params: {
        animationDuration: 1.0,
        glowOpacity: 1.0,
        accentIntensity: 1.0,
        chartDensity: 40,
        notificationInterval: 5000,
        suppressLowPriority: false,
        contrastFilter: "none",
        transitionSpeed: "0.3s ease",
      },
      isSoftened: false,
      isDeepCalm: false,
      scaleDuration: (ms: number) => ms,
      scaleGlow: (op: number) => op,
      chartDensity: 40,
    };
  }

  return {
    level: ctx.level,
    params: ctx.params,
    isSoftened: ctx.level !== CalmLevel.STANDARD,
    isDeepCalm: ctx.level === CalmLevel.DEEP_CALM,
    scaleDuration: (ms: number) => ms * ctx.params.animationDuration,
    scaleGlow: (op: number) => op * ctx.params.glowOpacity,
    chartDensity: ctx.params.chartDensity,
  };
}

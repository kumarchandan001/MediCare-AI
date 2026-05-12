/**
 * WearableReliabilityEngine — Moderates wearable confidence.
 * Prevents over-reliance on unstable or contradictory wearable data.
 * Drops the 'reliability score' if signals fluctuate wildly.
 */
import { useCallback } from "react";
import { useTemporalHealth } from "@/features/longitudinal-health/TemporalHealthStateProvider";

export interface WearableReliabilityReport {
  isReliable: boolean;
  reliabilityScore: number;
  confidencePenalty: number;
  moderationReason: string;
}

export function useWearableReliability() {
  const temporal = useTemporalHealth();

  /**
   * Assess the current reliability of wearable data and return a confidence penalty.
   */
  const assessReliability = useCallback((
    currentHR: number,
    currentHRV: number,
    driftDetected: boolean
  ): WearableReliabilityReport => {
    let score = 100;
    const penalties: string[] = [];

    const { restingHR, hrv } = temporal.wearableContinuity;

    // Check for extreme HR fluctuations relative to baseline
    if (restingHR.baseline > 0) {
      const hrVariance = Math.abs(currentHR - restingHR.baseline) / restingHR.baseline;
      if (hrVariance > 0.4) { // >40% variance is highly suspicious if sudden
        score -= 30;
        penalties.push("Erratic heart rate readings detected");
      } else if (hrVariance > 0.2) {
        score -= 10;
      }
    }

    // Check for HRV collapse (can be artifact or real stress, handle cautiously)
    if (hrv.baseline > 0 && currentHRV < hrv.baseline * 0.3) {
      score -= 20;
      penalties.push("Unusually low HRV signal");
    }

    // Moderate if drift is detected but symptoms don't match
    if (driftDetected) {
      score -= 15;
      penalties.push("Biometric drift detected without clear symptom correlation");
    }

    // Cap score
    score = Math.max(0, Math.min(100, score));

    // Calculate confidence penalty (0.0 to 1.0)
    // E.g., if reliability is 60, penalty is 0.4 (reduce wearable influence by 40%)
    const penalty = (100 - score) / 100;

    return {
      isReliable: score >= 70,
      reliabilityScore: score,
      confidencePenalty: penalty,
      moderationReason: penalties.length > 0
        ? `Wearable influence moderated due to: ${penalties.join(", ")}.`
        : "Wearable data appears stable and reliable.",
    };
  }, [temporal]);

  return { assessReliability };
}

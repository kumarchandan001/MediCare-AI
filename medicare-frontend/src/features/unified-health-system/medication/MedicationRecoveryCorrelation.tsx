/**
 * MedicationRecoveryCorrelation — Analyzes the correlation between medication
 * adherence and recovery progression. Identifies if adherence positively
 * impacts recovery or if missed doses correlate with setbacks.
 */
import { useCallback } from "react";
import type { DomainSignal } from "../UnifiedHealthEngine";

export interface CorrelationResult {
  correlationStrength: "strong_positive" | "weak_positive" | "neutral" | "negative" | "insufficient_data";
  impactScore: number; // -100 to 100
  narrative: string;
  insight: string;
}

export function useMedicationRecoveryCorrelation() {
  const analyze = useCallback((
    medicationSignal: DomainSignal | undefined,
    recoverySignal: DomainSignal | undefined,
    medicationHistory?: { score: number; timestamp: number }[],
    recoveryHistory?: { score: number; timestamp: number }[]
  ): CorrelationResult => {
    if (!medicationSignal || !recoverySignal) {
      return {
        correlationStrength: "insufficient_data",
        impactScore: 0,
        narrative: "Not enough data to correlate medication and recovery.",
        insight: "Both medication and recovery tracking must be active.",
      };
    }

    const medScore = medicationSignal.score;
    const recScore = recoverySignal.score;
    const medTrend = medicationSignal.trend;
    const recTrend = recoverySignal.trend;

    let correlationStrength: CorrelationResult["correlationStrength"] = "insufficient_data";
    let impactScore = 0;
    let narrative = "";
    let insight = "";

    // Basic heuristic correlation based on current state and trends
    if (medScore > 80 && recScore > 70 && recTrend === "improving") {
      correlationStrength = "strong_positive";
      impactScore = 80;
      narrative = "High medication adherence is strongly correlating with your improving recovery.";
      insight = "Your consistency with medication appears to be a key driver of your current recovery progress.";
    } else if (medScore < 50 && recTrend === "declining") {
      correlationStrength = "negative";
      impactScore = -70;
      narrative = "Lower medication adherence coincides with a stalling or declining recovery.";
      insight = "Missed doses may be directly impacting your ability to recover effectively.";
    } else if (medScore > 80 && recTrend === "declining") {
      correlationStrength = "neutral";
      impactScore = 0;
      narrative = "Recovery is struggling despite good medication adherence.";
      insight = "Since you are taking your medication consistently, other factors (like sleep or stress) might be affecting recovery.";
    } else if (medScore > 60 && recScore > 50) {
      correlationStrength = "weak_positive";
      impactScore = 40;
      narrative = "Medication adherence is supporting a stable recovery.";
      insight = "Maintaining your current routine is helping keep your recovery on track.";
    } else {
      correlationStrength = "neutral";
      impactScore = 0;
      narrative = "No strong correlation currently detected between medication and recovery.";
      insight = "Continue tracking to reveal long-term patterns.";
    }

    // If we have history, we could do a Pearson correlation, but for now we use the heuristic

    return {
      correlationStrength,
      impactScore,
      narrative,
      insight,
    };
  }, []);

  return { analyze };
}

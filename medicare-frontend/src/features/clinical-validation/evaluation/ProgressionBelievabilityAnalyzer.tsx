/**
 * ProgressionBelievabilityAnalyzer — Acts as a common-sense check on the AI.
 * If the AI predicts a disease progression that violates basic medical timelines
 * (e.g., bone healing in 2 days), this flags it.
 */
import { useCallback } from "react";

export interface BelievabilityResult {
  isBelievable: boolean;
  confidenceScore: number;
  flaggedViolations: string[];
}

export function useProgressionBelievabilityAnalyzer() {
  const analyze = useCallback((
    condition: string,
    predictedRecoveryDays: number
  ): BelievabilityResult => {
    const violations: string[] = [];
    let score = 100;

    const conditionLower = condition.toLowerCase();

    // Basic heuristic rules for believability
    if (conditionLower.includes("fracture") || conditionLower.includes("broken bone")) {
      if (predictedRecoveryDays < 21) {
        violations.push("Predicted recovery too fast for bone fracture (minimum ~3 weeks).");
        score -= 50;
      }
    }

    if (conditionLower.includes("common cold") || conditionLower.includes("mild uri")) {
      if (predictedRecoveryDays > 21) {
        violations.push("Predicted recovery too slow for mild viral infection.");
        score -= 40;
      }
    }

    return {
      isBelievable: score > 70,
      confidenceScore: score,
      flaggedViolations: violations
    };
  }, []);

  return { analyze };
}

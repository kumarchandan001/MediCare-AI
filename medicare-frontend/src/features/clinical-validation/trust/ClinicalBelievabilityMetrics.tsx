/**
 * ClinicalBelievabilityMetrics — Aggregates believability scores from
 * ProgressionBelievabilityAnalyzer across all active investigations to
 * provide a system-wide "believability index".
 */
import { useCallback } from "react";
import { useProgressionBelievabilityAnalyzer } from "../evaluation/ProgressionBelievabilityAnalyzer";

export interface BelievabilityIndex {
  systemScore: number;
  totalChecks: number;
  violationCount: number;
  worstOffender: string | null;
}

export function useClinicalBelievabilityMetrics() {
  const { analyze } = useProgressionBelievabilityAnalyzer();

  const computeIndex = useCallback((
    activeInvestigations: { condition: string; predictedDays: number }[]
  ): BelievabilityIndex => {
    if (activeInvestigations.length === 0) {
      return { systemScore: 100, totalChecks: 0, violationCount: 0, worstOffender: null };
    }

    let totalScore = 0;
    let violationCount = 0;
    let worstScore = 100;
    let worstOffender: string | null = null;

    activeInvestigations.forEach(inv => {
      const result = analyze(inv.condition, inv.predictedDays);
      totalScore += result.confidenceScore;
      if (!result.isBelievable) {
        violationCount++;
        if (result.confidenceScore < worstScore) {
          worstScore = result.confidenceScore;
          worstOffender = inv.condition;
        }
      }
    });

    return {
      systemScore: totalScore / activeInvestigations.length,
      totalChecks: activeInvestigations.length,
      violationCount,
      worstOffender,
    };
  }, [analyze]);

  return { computeIndex };
}

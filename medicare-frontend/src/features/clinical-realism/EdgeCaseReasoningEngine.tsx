/**
 * EdgeCaseReasoningEngine — Handles sparse evidence & conflicting symptoms.
 * Limits confidence when evidence is insufficient or highly contradictory.
 */
import { useCallback } from "react";

export interface EdgeCaseReport {
  isEdgeCase: boolean;
  edgeCaseType: "sparse_evidence" | "multi_conflict" | "chronic_unresolved" | "none";
  confidenceCap: number;
  disclosure: string;
}

export function useEdgeCaseReasoning() {
  
  /**
   * Evaluates the current evidence and hypotheses for edge cases.
   */
  const evaluateEdgeCases = useCallback((
    activeSymptoms: string[],
    topHypotheses: { condition: string; confidence: number }[],
    daysUnresolved: number
  ): EdgeCaseReport => {
    // 1. Sparse Evidence
    if (activeSymptoms.length <= 1) {
      const isVague = activeSymptoms.some(s => ["fatigue", "headache", "malaise"].includes(s.toLowerCase()));
      if (isVague) {
        return {
          isEdgeCase: true,
          edgeCaseType: "sparse_evidence",
          confidenceCap: 35, // Hard cap on confidence
          disclosure: "Reasoning confidence is limited due to sparse and general symptoms.",
        };
      }
    }

    // 2. Multi-Condition Conflict
    if (topHypotheses.length >= 3) {
      const top3 = topHypotheses.slice(0, 3);
      // If the top 3 are all very close in confidence (e.g., within 5%)
      const spread = top3[0].confidence - top3[2].confidence;
      if (spread < 5 && top3[0].confidence > 40) {
        return {
          isEdgeCase: true,
          edgeCaseType: "multi_conflict",
          confidenceCap: Math.max(45, top3[0].confidence - 15), // Reduce confidence
          disclosure: "Multiple conditions overlap significantly. Confidence moderated to reflect ambiguity.",
        };
      }
    }

    // 3. Chronic Unresolved
    if (daysUnresolved > 14) {
      return {
        isEdgeCase: true,
        edgeCaseType: "chronic_unresolved",
        confidenceCap: 60,
        disclosure: "Symptoms have persisted without clear resolution. Longitudinal tracking prioritized over acute diagnosis.",
      };
    }

    return {
      isEdgeCase: false,
      edgeCaseType: "none",
      confidenceCap: 100,
      disclosure: "No significant edge cases detected.",
    };
  }, []);

  return { evaluateEdgeCases };
}

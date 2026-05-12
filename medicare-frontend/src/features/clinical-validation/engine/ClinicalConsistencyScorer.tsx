/**
 * ClinicalConsistencyScorer — Analyzes the output of the clinical reasoning
 * engine across multiple similar inputs to detect contradictory advice,
 * ensuring high reliability and predictability in AI outputs.
 */
import { useCallback } from "react";

export interface ConsistencyScore {
  score: number; // 0-100
  variance: number;
  flaggedInconsistencies: string[];
}

export function useClinicalConsistencyScorer() {
  const scoreConsistency = useCallback((
    baselineOutput: string[],
    testOutputs: string[][]
  ): ConsistencyScore => {
    let inconsistencies: string[] = [];
    let matchCount = 0;
    const totalChecks = testOutputs.length * baselineOutput.length;

    testOutputs.forEach((outputSet, i) => {
      // Simplistic exact match logic for benchmarking purposes
      // In production, this would use semantic similarity embeddings
      const hasMajorDeviation = baselineOutput.some(b => !outputSet.includes(b));
      if (hasMajorDeviation) {
        inconsistencies.push(`Run ${i + 1} deviated from baseline critical findings.`);
      } else {
        matchCount += baselineOutput.length;
      }
    });

    const score = totalChecks > 0 ? (matchCount / totalChecks) * 100 : 100;

    return {
      score,
      variance: 100 - score,
      flaggedInconsistencies: inconsistencies,
    };
  }, []);

  return { scoreConsistency };
}

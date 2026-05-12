/**
 * LongitudinalReasoningEvaluator — Assesses the AI's reasoning over long periods.
 * It ensures that the system doesn't abruptly change its diagnostic trajectory
 * without new, significant evidence.
 */
import { useCallback } from "react";
import type { HealthMemoryEntry } from "../../unified-health-system/memory/UnifiedHealthMemory";

export interface ReasoningEvaluation {
  isStable: boolean;
  driftScore: number; // 0 (no drift) to 100 (complete reversal)
  notes: string[];
}

export function useLongitudinalReasoningEvaluator() {
  const evaluateTrajectory = useCallback((
    historicalReasoning: HealthMemoryEntry[],
    currentReasoning: string
  ): ReasoningEvaluation => {
    const notes: string[] = [];
    let driftScore = 0;

    // Filter to only investigation/prediction related memories
    const relevantHistory = historicalReasoning.filter(m => m.domain === "disease_intelligence");

    if (relevantHistory.length === 0) {
      return { isStable: true, driftScore: 0, notes: ["No historical baseline to compare against."] };
    }

    // simplistic exact match checking for demonstration
    // In a real system, semantic similarity (cosine similarity on embeddings) would be used.
    const recentConclusion = relevantHistory[0].summary;
    
    if (recentConclusion && !currentReasoning.includes(recentConclusion) && !recentConclusion.includes(currentReasoning)) {
      driftScore = 75; // Significant shift detected
      notes.push(`Diagnostic trajectory shifted from "${recentConclusion}" to "${currentReasoning}".`);
      notes.push("Review required to ensure shift is supported by new evidence.");
    } else {
      notes.push("Reasoning is consistent with historical trajectory.");
    }

    return {
      isStable: driftScore < 50,
      driftScore,
      notes,
    };
  }, []);

  return { evaluateTrajectory };
}

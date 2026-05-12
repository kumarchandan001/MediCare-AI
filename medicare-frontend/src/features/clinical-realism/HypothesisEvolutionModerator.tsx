/**
 * HypothesisEvolutionModerator — Controls how hypotheses transition over time.
 * Prevents abrupt condition switching, ensures ranking changes are evidence-driven,
 * and maintains a "clinical memory" of why each hypothesis rose or fell.
 */
import { useCallback, useRef } from "react";

export interface HypothesisTransition {
  condition: string;
  previousRank: number;
  currentRank: number;
  previousConfidence: number;
  currentConfidence: number;
  transition: "promoted" | "demoted" | "stable" | "new" | "removed";
  evidenceBasis: string;
  timestamp: number;
}

export interface EvolutionReport {
  transitions: HypothesisTransition[];
  rankingStable: boolean;
  topHypothesisChanged: boolean;
  evolutionNarrative: string;
  warnings: string[];
}

export function useHypothesisEvolution() {
  const previousRankingRef = useRef<{ condition: string; confidence: number }[]>([]);
  const transitionHistoryRef = useRef<HypothesisTransition[]>([]);

  const moderateEvolution = useCallback((
    currentHypotheses: { condition: string; confidence: number }[],
    evidenceStrength: string,
  ): EvolutionReport => {
    const prev = previousRankingRef.current;
    const transitions: HypothesisTransition[] = [];
    const warnings: string[] = [];

    // Sort both by confidence descending
    const sorted = [...currentHypotheses].sort((a, b) => b.confidence - a.confidence);
    const prevSorted = [...prev].sort((a, b) => b.confidence - a.confidence);

    const prevMap = new Map(prevSorted.map((h, i) => [h.condition, { rank: i, confidence: h.confidence }]));

    for (let i = 0; i < sorted.length; i++) {
      const hyp = sorted[i];
      const prevEntry = prevMap.get(hyp.condition);

      if (!prevEntry) {
        transitions.push({
          condition: hyp.condition,
          previousRank: -1,
          currentRank: i,
          previousConfidence: 0,
          currentConfidence: hyp.confidence,
          transition: "new",
          evidenceBasis: "Newly introduced hypothesis",
          timestamp: Date.now(),
        });
      } else {
        const rankDelta = prevEntry.rank - i; // positive = promoted
        let transition: HypothesisTransition["transition"] = "stable";
        if (rankDelta > 0) transition = "promoted";
        else if (rankDelta < 0) transition = "demoted";

        // Warn if top hypothesis changed without strong evidence
        if (i === 0 && prevEntry.rank !== 0 && evidenceStrength !== "strong") {
          warnings.push(
            `Primary hypothesis changed from "${prevSorted[0]?.condition}" to "${hyp.condition}" without strong evidence — consider maintaining previous ranking.`
          );
        }

        transitions.push({
          condition: hyp.condition,
          previousRank: prevEntry.rank,
          currentRank: i,
          previousConfidence: prevEntry.confidence,
          currentConfidence: hyp.confidence,
          transition,
          evidenceBasis: evidenceStrength === "strong"
            ? "Supported by strong new evidence"
            : evidenceStrength === "moderate"
              ? "Moderate evidence-based adjustment"
              : "Evolving — limited evidence",
          timestamp: Date.now(),
        });
      }
    }

    // Check for removed hypotheses
    for (const [condition, entry] of prevMap.entries()) {
      if (!sorted.find(h => h.condition === condition)) {
        transitions.push({
          condition,
          previousRank: entry.rank,
          currentRank: -1,
          previousConfidence: entry.confidence,
          currentConfidence: 0,
          transition: "removed",
          evidenceBasis: "No longer supported by evidence",
          timestamp: Date.now(),
        });
        if (entry.rank === 0) {
          warnings.push(`Primary hypothesis "${condition}" was removed entirely — this is a significant clinical event.`);
        }
      }
    }

    const topChanged = prev.length > 0 && sorted.length > 0 && prevSorted[0]?.condition !== sorted[0]?.condition;
    const rankingStable = transitions.every(t => t.transition === "stable");

    // Build narrative
    let narrative: string;
    if (prev.length === 0) {
      narrative = "Initial assessment established.";
    } else if (rankingStable) {
      narrative = "Clinical reasoning remains consistent with the previous assessment.";
    } else if (topChanged) {
      narrative = `The primary consideration has shifted to ${sorted[0]?.condition}. This reflects evolving clinical evidence.`;
    } else {
      const changes = transitions.filter(t => t.transition !== "stable");
      narrative = `${changes.length} hypothesis ranking${changes.length > 1 ? "s" : ""} adjusted based on ${evidenceStrength} evidence.`;
    }

    // Store for next comparison
    transitionHistoryRef.current.push(...transitions);
    if (transitionHistoryRef.current.length > 100) {
      transitionHistoryRef.current = transitionHistoryRef.current.slice(-50);
    }
    previousRankingRef.current = sorted;

    return { transitions, rankingStable, topHypothesisChanged: topChanged, evolutionNarrative: narrative, warnings };
  }, []);

  const getTransitionHistory = useCallback(() => [...transitionHistoryRef.current], []);

  const reset = useCallback(() => {
    previousRankingRef.current = [];
    transitionHistoryRef.current = [];
  }, []);

  return { moderateEvolution, getTransitionHistory, reset };
}

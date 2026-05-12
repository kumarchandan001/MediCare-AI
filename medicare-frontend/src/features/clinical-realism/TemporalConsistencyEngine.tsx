/**
 * TemporalConsistencyEngine — Biological progression constraints.
 * Ensures recovery/deterioration timelines follow medically plausible
 * trajectories. Prevents instant state changes and validates that
 * symptom persistence behaves realistically over time.
 */
import { useCallback, useMemo } from "react";
import { useTemporalHealth } from "@/features/longitudinal-health/TemporalHealthStateProvider";

export interface TemporalValidation {
  isPlausible: boolean;
  violations: string[];
  adjustments: string[];
  recoveryRealism: "realistic" | "accelerated" | "stalled" | "unknown";
  progressionNarrative: string;
}

// Minimum days for recovery to be considered "confirmed" by condition type
const RECOVERY_MINIMUMS: Record<string, number> = {
  respiratory: 5,
  cardiac: 7,
  neurological: 10,
  gastrointestinal: 3,
  musculoskeletal: 5,
  infectious: 4,
  chronic: 14,
  default: 4,
};

export function useTemporalConsistency() {
  const temporal = useTemporalHealth();

  /**
   * Validate whether a recovery claim is biologically plausible.
   */
  const validateRecovery = useCallback((): TemporalValidation => {
    const recovery = temporal.activeRecovery;
    if (!recovery) {
      return {
        isPlausible: true,
        violations: [],
        adjustments: [],
        recoveryRealism: "unknown",
        progressionNarrative: "No active recovery being tracked.",
      };
    }

    const violations: string[] = [];
    const adjustments: string[] = [];
    let realism: TemporalValidation["recoveryRealism"] = "realistic";

    // Check minimum recovery timeline
    const conditionType = guessConditionCategory(recovery.activeCondition);
    const minDays = RECOVERY_MINIMUMS[conditionType] || RECOVERY_MINIMUMS.default;

    if (recovery.currentDay < minDays && recovery.stabilityScore > 85) {
      violations.push(`Recovery stability (${recovery.stabilityScore}%) is unusually high for day ${recovery.currentDay} of ${recovery.activeCondition} recovery.`);
      adjustments.push(`Stability capped at ${Math.min(recovery.stabilityScore, 60 + recovery.currentDay * 5)}% for biological plausibility.`);
      realism = "accelerated";
    }

    if (recovery.currentDay >= minDays * 2 && recovery.stabilityScore < 40) {
      violations.push(`Recovery appears stalled at day ${recovery.currentDay} — stability remains low.`);
      realism = "stalled";
    }

    // Check trend consistency
    if (recovery.trend === "improving" && recovery.stabilityScore < 30) {
      violations.push("Recovery marked as 'improving' but stability score is below 30%.");
      adjustments.push("Trend adjusted to 'fragile' for consistency.");
    }

    if (recovery.trend === "declining" && recovery.stabilityScore > 80) {
      violations.push("Recovery marked as 'declining' but stability score is above 80%.");
      adjustments.push("Trend adjusted to 'stable' for consistency.");
    }

    // Build narrative
    let narrative: string;
    if (realism === "accelerated") {
      narrative = `Your ${recovery.activeCondition} recovery is progressing, but it's still early — day ${recovery.currentDay}. Full recovery typically takes longer, so continued observation is important.`;
    } else if (realism === "stalled") {
      narrative = `Your ${recovery.activeCondition} recovery has been ongoing for ${recovery.currentDay} days but stability remains variable. This is sometimes normal, though it may be worth discussing with a healthcare provider.`;
    } else {
      narrative = `Recovery from ${recovery.activeCondition} is proceeding at a normal pace — day ${recovery.currentDay} with ${recovery.stabilityScore}% stability.`;
    }

    return {
      isPlausible: violations.length === 0,
      violations,
      adjustments,
      recoveryRealism: realism,
      progressionNarrative: narrative,
    };
  }, [temporal]);

  /**
   * Validate whether a deterioration claim is temporally coherent.
   */
  const validateDeterioration = useCallback((
    currentSeverity: number,
    previousSeverity: number,
    hoursSinceLastCheck: number
  ): { isPlausible: boolean; moderatedSeverity: number; explanation: string } => {
    const delta = currentSeverity - previousSeverity;
    const maxPlausibleIncrease = Math.min(20, hoursSinceLastCheck * 3); // Max ~3 severity units per hour

    if (delta > maxPlausibleIncrease) {
      return {
        isPlausible: false,
        moderatedSeverity: previousSeverity + maxPlausibleIncrease,
        explanation: `Severity increase moderated: a jump of ${delta} points in ${hoursSinceLastCheck.toFixed(1)} hours exceeds plausible biological progression.`,
      };
    }

    return {
      isPlausible: true,
      moderatedSeverity: currentSeverity,
      explanation: "Severity progression is within expected biological range.",
    };
  }, []);

  /**
   * Check narrative consistency — does the current story align with history?
   */
  const validateNarrativeConsistency = useCallback((): string[] => {
    const issues: string[] = [];
    const { investigations, activeRecovery, recurringPatterns } = temporal;

    if (investigations.length >= 2) {
      const last = investigations[investigations.length - 1];
      const prev = investigations[investigations.length - 2];

      // Check if contradictory outcomes occurred too quickly
      if (last.outcome === "resolved" && prev.outcome === "worsened" &&
        last.timestamp - prev.timestamp < 86400000) { // Less than 1 day
        issues.push("A condition resolved within 24 hours of being flagged as worsened — this transition may be unrealistically fast.");
      }
    }

    // Check recurring pattern coherence
    for (const pattern of recurringPatterns) {
      if (pattern.occurrences >= 3 && pattern.severity === "mild") {
        issues.push(`Pattern '${pattern.symptomCluster[0]?.replace(/_/g, " ")}' has recurred ${pattern.occurrences} times but is still rated 'mild' — severity may need reassessment.`);
      }
    }

    return issues;
  }, [temporal]);

  return { validateRecovery, validateDeterioration, validateNarrativeConsistency };
}

function guessConditionCategory(condition: string): string {
  const lower = condition.toLowerCase();
  if (/breath|cough|lung|pneum|asthma|bronch|respiratory/.test(lower)) return "respiratory";
  if (/heart|cardiac|chest pain|palpitat/.test(lower)) return "cardiac";
  if (/head|migraine|neuro|dizz|seizure/.test(lower)) return "neurological";
  if (/stomach|nausea|digest|gastro|diarr|vomit/.test(lower)) return "gastrointestinal";
  if (/muscle|joint|back|pain|arthri|sprain/.test(lower)) return "musculoskeletal";
  if (/infect|fever|flu|cold|viral|bacteria/.test(lower)) return "infectious";
  if (/chronic|diabet|hypertens|thyroid/.test(lower)) return "chronic";
  return "default";
}

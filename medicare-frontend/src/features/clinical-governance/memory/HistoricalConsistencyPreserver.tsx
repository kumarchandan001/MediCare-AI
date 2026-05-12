/**
 * HistoricalConsistencyPreserver — Validates new governance decisions
 * don't contradict historical ones. Detects governance drift.
 */
import { useCallback } from "react";
import { useGovernanceMemory } from "./GovernanceMemoryLayer";

export interface ConsistencyCheck {
  isConsistent: boolean;
  contradictions: { description: string; severity: "low" | "medium" | "high" }[];
  driftDetected: boolean;
  driftDescription?: string;
}

export function useHistoricalConsistencyPreserver() {
  const memory = useGovernanceMemory();

  const validate = useCallback((newDecision: {
    condition: string;
    verdict: "passed" | "moderated" | "blocked";
    escalation: string;
    confidence: number;
  }): ConsistencyCheck => {
    const contradictions: ConsistencyCheck["contradictions"] = [];
    const history = memory.getConditionHistory(newDecision.condition);

    if (history.length === 0) return { isConsistent: true, contradictions: [], driftDetected: false };

    const recent = history.slice(-5);
    const lastEntry = recent[recent.length - 1];

    // Check verdict consistency: blocked → passed without explanation
    if (lastEntry.verdict === "blocked" && newDecision.verdict === "passed") {
      const hoursSince = (Date.now() - lastEntry.timestamp) / 3_600_000;
      if (hoursSince < 1) {
        contradictions.push({
          description: `"${newDecision.condition}" was blocked ${hoursSince.toFixed(0)}h ago but now passes — verify evidence change.`,
          severity: "high",
        });
      }
    }

    // Check escalation regression without recovery
    if ((lastEntry.escalationLevel === "critical" || lastEntry.escalationLevel === "emergency") &&
        (newDecision.escalation === "none" || newDecision.escalation === "low")) {
      const hoursSince = (Date.now() - lastEntry.timestamp) / 3_600_000;
      if (hoursSince < 12) {
        contradictions.push({
          description: `"${newDecision.condition}" escalation dropped from ${lastEntry.escalationLevel} to ${newDecision.escalation} in ${hoursSince.toFixed(0)}h.`,
          severity: "medium",
        });
      }
    }

    // Detect governance drift: consistent moderation pattern changing
    const moderatedCount = recent.filter(e => e.verdict === "moderated").length;
    const totalRecent = recent.length;
    const historicalModerationRate = moderatedCount / totalRecent;
    const isDrifting = historicalModerationRate > 0.6 && newDecision.verdict === "passed";

    return {
      isConsistent: contradictions.length === 0,
      contradictions,
      driftDetected: isDrifting,
      driftDescription: isDrifting
        ? `Governance has been moderating "${newDecision.condition}" frequently (${(historicalModerationRate * 100).toFixed(0)}%) but this pass was clean — monitor for drift.`
        : undefined,
    };
  }, [memory]);

  return { validate };
}

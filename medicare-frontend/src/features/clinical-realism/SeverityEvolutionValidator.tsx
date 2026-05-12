/**
 * SeverityEvolutionValidator — Validates that severity changes follow
 * clinically plausible trajectories. Prevents instant severity swings
 * and ensures that severe conditions require accumulated evidence.
 */
import { useCallback, useRef } from "react";

export interface SeveritySnapshot {
  severity: number;
  timestamp: number;
  source: string;
}

export interface SeverityEvolutionReport {
  isPlausible: boolean;
  moderatedSeverity: number;
  originalSeverity: number;
  wasModerated: boolean;
  trajectory: "improving" | "worsening" | "stable" | "fluctuating";
  explanation: string;
}

const MAX_INCREASE_PER_HOUR = 4;  // Max severity units per hour (1-100 scale)
const MAX_DECREASE_PER_HOUR = 6;  // Recovery can be slightly faster than worsening

export function useSeverityEvolution() {
  const historyRef = useRef<SeveritySnapshot[]>([]);

  const validate = useCallback((
    currentSeverity: number,
    source: string = "system"
  ): SeverityEvolutionReport => {
    const now = Date.now();
    const history = historyRef.current;

    // First reading — accept as-is
    if (history.length === 0) {
      history.push({ severity: currentSeverity, timestamp: now, source });
      return {
        isPlausible: true,
        moderatedSeverity: currentSeverity,
        originalSeverity: currentSeverity,
        wasModerated: false,
        trajectory: "stable",
        explanation: "Initial severity assessment recorded.",
      };
    }

    const last = history[history.length - 1];
    const hoursSince = Math.max(0.1, (now - last.timestamp) / 3_600_000);
    const delta = currentSeverity - last.severity;

    let moderatedSeverity = currentSeverity;
    let wasModerated = false;
    let explanation: string;

    if (delta > 0) {
      // Worsening
      const maxAllowed = MAX_INCREASE_PER_HOUR * hoursSince;
      if (delta > maxAllowed) {
        moderatedSeverity = Math.round(last.severity + maxAllowed);
        wasModerated = true;
        explanation = `Severity increase moderated: +${delta} over ${hoursSince.toFixed(1)}h exceeds biological plausibility. Capped at +${maxAllowed.toFixed(0)}.`;
      } else {
        explanation = `Severity increased by ${delta} over ${hoursSince.toFixed(1)}h — within expected range.`;
      }
    } else if (delta < 0) {
      // Improving
      const maxAllowed = MAX_DECREASE_PER_HOUR * hoursSince;
      if (Math.abs(delta) > maxAllowed) {
        moderatedSeverity = Math.round(last.severity - maxAllowed);
        wasModerated = true;
        explanation = `Recovery pace moderated: ${Math.abs(delta)} points in ${hoursSince.toFixed(1)}h is faster than typical biological recovery. Adjusted to -${maxAllowed.toFixed(0)}.`;
      } else {
        explanation = `Severity decreased by ${Math.abs(delta)} over ${hoursSince.toFixed(1)}h — recovery is progressing naturally.`;
      }
    } else {
      explanation = "Severity unchanged.";
    }

    moderatedSeverity = Math.max(0, Math.min(100, moderatedSeverity));

    // Determine trajectory
    let trajectory: SeverityEvolutionReport["trajectory"];
    if (history.length >= 3) {
      const recentDeltas = history.slice(-3).map((s, i, arr) =>
        i > 0 ? s.severity - arr[i - 1].severity : 0
      ).slice(1);
      const allUp = recentDeltas.every(d => d > 0);
      const allDown = recentDeltas.every(d => d < 0);
      const mixed = recentDeltas.some(d => d > 0) && recentDeltas.some(d => d < 0);
      if (allUp) trajectory = "worsening";
      else if (allDown) trajectory = "improving";
      else if (mixed) trajectory = "fluctuating";
      else trajectory = "stable";
    } else {
      trajectory = delta > 2 ? "worsening" : delta < -2 ? "improving" : "stable";
    }

    // Record
    history.push({ severity: moderatedSeverity, timestamp: now, source });
    if (history.length > 50) history.shift();

    return {
      isPlausible: !wasModerated,
      moderatedSeverity,
      originalSeverity: currentSeverity,
      wasModerated,
      trajectory,
      explanation,
    };
  }, []);

  const getHistory = useCallback(() => [...historyRef.current], []);

  const reset = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { validate, getHistory, reset };
}

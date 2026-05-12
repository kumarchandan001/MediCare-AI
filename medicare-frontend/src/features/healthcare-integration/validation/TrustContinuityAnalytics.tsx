/**
 * TrustContinuityAnalytics — Analyzes how trust in the AI companion
 * is maintained or degraded across different types of interactions.
 */
import { useCallback } from "react";

export interface TrustContinuityEvent {
  interactionType: string;
  preTrustScore: number;
  postTrustScore: number;
  delta: number;
  userFeedback: "positive" | "neutral" | "negative" | null;
}

export function useTrustContinuityAnalytics() {
  const analyzeContinuity = useCallback((events: TrustContinuityEvent[]): { overallDelta: number; mostDamaging: string | null; mostBuilding: string | null } => {
    if (events.length === 0) return { overallDelta: 0, mostDamaging: null, mostBuilding: null };
    const byType = new Map<string, number[]>();
    events.forEach(e => { const arr = byType.get(e.interactionType) || []; arr.push(e.delta); byType.set(e.interactionType, arr); });
    let highest = -100; let lowest = 100;
    let building: string | null = null; let damaging: string | null = null;
    byType.forEach((deltas, type) => {
      const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
      if (avg > highest) { highest = avg; building = type; }
      if (avg < lowest) { lowest = avg; damaging = type; }
    });
    return { overallDelta: events.reduce((s, e) => s + e.delta, 0) / events.length, mostDamaging: damaging, mostBuilding: building };
  }, []);

  return { analyzeContinuity };
}

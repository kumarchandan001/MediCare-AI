/**
 * HypothesisEvolutionHistory — Records how hypotheses changed across
 * conversation turns. Stores rank changes, confidence shifts, additions,
 * removals, with reasons for each change.
 */
import { useCallback, useRef } from "react";

export interface HypothesisSnapshot {
  turnIndex: number;
  timestamp: number;
  hypotheses: { condition: string; confidence: number; rank: number }[];
  changes: HypothesisChange[];
}

export interface HypothesisChange {
  type: "added" | "removed" | "rank_changed" | "confidence_shifted" | "primary_changed";
  condition: string;
  detail: string;
  previousValue?: string | number;
  newValue?: string | number;
}

export interface EvolutionTimeline {
  snapshots: HypothesisSnapshot[];
  totalTurns: number;
  primaryChanges: number;
  significantShifts: number;
  narrative: string;
}

export function useHypothesisEvolutionHistory() {
  const snapshotsRef = useRef<HypothesisSnapshot[]>([]);

  const recordTurn = useCallback((hypotheses: { condition: string; confidence: number }[]): HypothesisSnapshot => {
    const turnIndex = snapshotsRef.current.length;
    const ranked = hypotheses.map((h, i) => ({ ...h, rank: i + 1 }));
    const changes: HypothesisChange[] = [];

    if (turnIndex > 0) {
      const prev = snapshotsRef.current[turnIndex - 1];
      const prevMap = new Map(prev.hypotheses.map(h => [h.condition, h]));
      const currMap = new Map(ranked.map(h => [h.condition, h]));

      // Check for additions
      for (const h of ranked) {
        if (!prevMap.has(h.condition)) {
          changes.push({ type: "added", condition: h.condition, detail: `"${h.condition}" appeared at rank ${h.rank} (${h.confidence.toFixed(0)}%)` });
        }
      }

      // Check for removals
      for (const h of prev.hypotheses) {
        if (!currMap.has(h.condition)) {
          changes.push({ type: "removed", condition: h.condition, detail: `"${h.condition}" dropped from consideration` });
        }
      }

      // Check for rank/confidence changes
      for (const h of ranked) {
        const prevH = prevMap.get(h.condition);
        if (prevH) {
          if (prevH.rank !== h.rank) {
            changes.push({ type: "rank_changed", condition: h.condition, detail: `"${h.condition}" moved from rank ${prevH.rank} to ${h.rank}`, previousValue: prevH.rank, newValue: h.rank });
          }
          const confDelta = Math.abs(h.confidence - prevH.confidence);
          if (confDelta > 5) {
            changes.push({ type: "confidence_shifted", condition: h.condition, detail: `"${h.condition}" confidence ${h.confidence > prevH.confidence ? "increased" : "decreased"} by ${confDelta.toFixed(0)}%`, previousValue: prevH.confidence, newValue: h.confidence });
          }
        }
      }

      // Check primary change
      if (prev.hypotheses[0]?.condition !== ranked[0]?.condition) {
        changes.push({ type: "primary_changed", condition: ranked[0]?.condition || "", detail: `Primary hypothesis changed from "${prev.hypotheses[0]?.condition}" to "${ranked[0]?.condition}"` });
      }
    }

    const snapshot: HypothesisSnapshot = { turnIndex, timestamp: Date.now(), hypotheses: ranked, changes };
    snapshotsRef.current.push(snapshot);
    if (snapshotsRef.current.length > 50) snapshotsRef.current = snapshotsRef.current.slice(-30);

    return snapshot;
  }, []);

  const getTimeline = useCallback((): EvolutionTimeline => {
    const all = snapshotsRef.current;
    const primaryChanges = all.filter(s => s.changes.some(c => c.type === "primary_changed")).length;
    const significantShifts = all.filter(s => s.changes.some(c => c.type === "confidence_shifted" && Math.abs((c.newValue as number) - (c.previousValue as number)) > 15)).length;

    let narrative: string;
    if (all.length <= 1) {
      narrative = "Initial assessment — hypothesis evolution tracking has begun.";
    } else if (primaryChanges === 0) {
      narrative = `Across ${all.length} turns, the primary hypothesis has remained consistent.`;
    } else {
      narrative = `Across ${all.length} turns, the primary hypothesis changed ${primaryChanges} time(s). ${significantShifts > 0 ? `${significantShifts} significant confidence shift(s) occurred.` : "Confidence has been stable."}`;
    }

    return { snapshots: [...all], totalTurns: all.length, primaryChanges, significantShifts, narrative };
  }, []);

  const getConditionHistory = useCallback((condition: string) => {
    return snapshotsRef.current
      .filter(s => s.hypotheses.some(h => h.condition === condition))
      .map(s => {
        const h = s.hypotheses.find(h => h.condition === condition)!;
        return { turn: s.turnIndex, timestamp: s.timestamp, confidence: h.confidence, rank: h.rank };
      });
  }, []);

  return { recordTurn, getTimeline, getConditionHistory };
}

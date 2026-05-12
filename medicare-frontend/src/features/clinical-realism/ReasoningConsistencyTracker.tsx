/**
 * ReasoningConsistencyTracker — Prevents unrealistic confidence swings.
 * Applies exponential smoothing to hypothesis confidence values, ensuring
 * changes are gradual unless strong new evidence justifies a sharp shift.
 * Tracks confidence history for audit trail transparency.
 */
import { useCallback, useRef, useMemo } from "react";

export interface ConfidenceSnapshot {
  condition: string;
  rawConfidence: number;
  smoothedConfidence: number;
  delta: number;
  reason: string;
  timestamp: number;
}

export interface ConsistencyReport {
  isStable: boolean;
  volatilityScore: number;        // 0-100 (0 = perfectly stable)
  moderatedHypotheses: { condition: string; raw: number; moderated: number }[];
  confidenceShifts: ConfidenceSnapshot[];
  warnings: string[];
}

const SMOOTHING_FACTOR = 0.35;          // How much new data influences the result
const MAX_SINGLE_JUMP = 25;             // Max allowed confidence change in one turn
const VOLATILITY_THRESHOLD = 40;        // Flag if total recent volatility exceeds this
const HISTORY_DEPTH = 20;

export function useReasoningConsistency() {
  const historyRef = useRef<Map<string, number[]>>(new Map());
  const snapshotsRef = useRef<ConfidenceSnapshot[]>([]);

  /**
   * Moderate a set of hypotheses by smoothing confidence values.
   * Returns moderated hypotheses and a consistency report.
   */
  const moderateHypotheses = useCallback((
    hypotheses: { condition: string; confidence: number }[],
    evidenceStrength: string
  ): ConsistencyReport => {
    const moderated: ConsistencyReport["moderatedHypotheses"] = [];
    const shifts: ConfidenceSnapshot[] = [];
    const warnings: string[] = [];
    let totalVolatility = 0;

    // Strong evidence allows faster shifts
    const allowedJump = evidenceStrength === "strong" ? MAX_SINGLE_JUMP * 1.5
      : evidenceStrength === "moderate" ? MAX_SINGLE_JUMP
      : MAX_SINGLE_JUMP * 0.6;

    for (const hyp of hypotheses) {
      const history = historyRef.current.get(hyp.condition) || [];
      const lastValue = history.length > 0 ? history[history.length - 1] : hyp.confidence;

      // Exponential smoothing
      let smoothed = SMOOTHING_FACTOR * hyp.confidence + (1 - SMOOTHING_FACTOR) * lastValue;

      // Clamp maximum single-turn jump
      const delta = smoothed - lastValue;
      if (Math.abs(delta) > allowedJump) {
        smoothed = lastValue + Math.sign(delta) * allowedJump;
        warnings.push(`${hyp.condition}: confidence shift clamped (${delta.toFixed(1)}% → ${Math.sign(delta) * allowedJump}%)`);
      }

      // Ensure bounds
      smoothed = Math.max(0, Math.min(100, Math.round(smoothed * 10) / 10));

      // Track history
      history.push(smoothed);
      if (history.length > HISTORY_DEPTH) history.shift();
      historyRef.current.set(hyp.condition, history);

      totalVolatility += Math.abs(delta);

      const snapshot: ConfidenceSnapshot = {
        condition: hyp.condition,
        rawConfidence: hyp.confidence,
        smoothedConfidence: smoothed,
        delta: Math.round((smoothed - lastValue) * 10) / 10,
        reason: Math.abs(delta) > allowedJump ? "Clamped for stability" : "Smoothed",
        timestamp: Date.now(),
      };
      shifts.push(snapshot);
      snapshotsRef.current.push(snapshot);
      if (snapshotsRef.current.length > 50) snapshotsRef.current.shift();

      moderated.push({ condition: hyp.condition, raw: hyp.confidence, moderated: smoothed });
    }

    const isStable = totalVolatility < VOLATILITY_THRESHOLD;
    if (!isStable) {
      warnings.push("Reasoning volatility detected — confidence values are being stabilized.");
    }

    return {
      isStable,
      volatilityScore: Math.min(100, Math.round(totalVolatility)),
      moderatedHypotheses: moderated,
      confidenceShifts: shifts,
      warnings,
    };
  }, []);

  /** Get full confidence history for audit trail */
  const getAuditHistory = useCallback(() => {
    return [...snapshotsRef.current];
  }, []);

  /** Reset tracking (e.g., for a new investigation) */
  const reset = useCallback(() => {
    historyRef.current.clear();
    snapshotsRef.current = [];
  }, []);

  return { moderateHypotheses, getAuditHistory, reset };
}

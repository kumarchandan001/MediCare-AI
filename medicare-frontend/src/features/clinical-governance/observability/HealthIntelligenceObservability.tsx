/**
 * HealthIntelligenceObservability — Central observability hook collecting
 * metrics from all engines. Tracks investigation count, error rate,
 * escalation frequency, contradiction rate, and reasoning consistency.
 */
import { useCallback, useRef, useMemo } from "react";

export interface ObservabilityMetrics {
  investigations: { total: number; completed: number; abandoned: number; errors: number };
  escalations: { total: number; moderated: number; critical: number; moderationRate: number };
  safety: { violations: number; blocked: number; blockRate: number };
  reasoning: { avgStability: number; avgConfidence: number; contradictionRate: number };
  wearable: { connectedSessions: number; fallbackSessions: number; avgReliability: number };
  performance: { avgDurationMs: number; p95DurationMs: number };
  governance: { passRate: number; totalPasses: number; avgTrustDelta: number };
}

interface MetricSample {
  timestamp: number;
  type: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export function useHealthIntelligenceObservability() {
  const samples = useRef<MetricSample[]>([]);

  const recordMetric = useCallback((type: string, value: number, metadata?: Record<string, unknown>) => {
    samples.current.push({ timestamp: Date.now(), type, value, metadata });
    if (samples.current.length > 1000) samples.current = samples.current.slice(-800);
  }, []);

  const getMetrics = useCallback((): ObservabilityMetrics => {
    const s = samples.current;
    const inv = s.filter(m => m.type === "investigation");
    const esc = s.filter(m => m.type === "escalation");
    const saf = s.filter(m => m.type === "safety");
    const rea = s.filter(m => m.type === "reasoning_stability");
    const wear = s.filter(m => m.type === "wearable_reliability");
    const dur = s.filter(m => m.type === "investigation_duration");
    const gov = s.filter(m => m.type === "governance_pass");

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const p95 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    };

    const completed = inv.filter(m => m.metadata?.outcome === "completed").length;
    const abandoned = inv.filter(m => m.metadata?.outcome === "abandoned").length;
    const errors = inv.filter(m => m.metadata?.outcome === "error").length;
    const escModerated = esc.filter(m => m.metadata?.moderated).length;
    const escCritical = esc.filter(m => m.value >= 4).length;
    const safBlocked = saf.filter(m => m.metadata?.blocked).length;

    return {
      investigations: { total: inv.length, completed, abandoned, errors },
      escalations: {
        total: esc.length,
        moderated: escModerated,
        critical: escCritical,
        moderationRate: esc.length > 0 ? escModerated / esc.length : 0,
      },
      safety: {
        violations: saf.length,
        blocked: safBlocked,
        blockRate: saf.length > 0 ? safBlocked / saf.length : 0,
      },
      reasoning: {
        avgStability: avg(rea.map(m => m.value)),
        avgConfidence: avg(s.filter(m => m.type === "confidence").map(m => m.value)),
        contradictionRate: avg(s.filter(m => m.type === "contradiction").map(m => m.value)),
      },
      wearable: {
        connectedSessions: wear.filter(m => m.value > 60).length,
        fallbackSessions: wear.filter(m => m.value <= 60).length,
        avgReliability: avg(wear.map(m => m.value)),
      },
      performance: {
        avgDurationMs: avg(dur.map(m => m.value)),
        p95DurationMs: p95(dur.map(m => m.value)),
      },
      governance: {
        passRate: gov.length > 0 ? gov.filter(m => m.value > 0).length / gov.length : 1,
        totalPasses: gov.length,
        avgTrustDelta: avg(gov.map(m => m.value)),
      },
    };
  }, []);

  return { recordMetric, getMetrics };
}

/**
 * InvestigationHealthMetrics — Per-investigation metrics: duration,
 * question count, confidence stability, governance pass rate.
 * Aggregates metrics for trend analysis.
 */
import { useCallback, useRef } from "react";

export interface InvestigationMetrics {
  investigationId: string;
  sessionId: string;
  timestamp: number;
  durationMs: number;
  questionCount: number;
  symptomCount: number;
  hypothesisCount: number;
  primaryConfidence: number;
  stabilityScore: number;
  governancePassed: boolean;
  moderationCount: number;
  escalationLevel: string;
  wearableUsed: boolean;
}

export interface MetricsTrend {
  avgDuration: number;
  avgConfidence: number;
  avgStability: number;
  governancePassRate: number;
  avgModerations: number;
  trend: "improving" | "stable" | "declining";
}

export function useInvestigationHealthMetrics() {
  const metricsRef = useRef<InvestigationMetrics[]>([]);

  const record = useCallback((metrics: InvestigationMetrics) => {
    metricsRef.current.push(metrics);
    if (metricsRef.current.length > 100) metricsRef.current = metricsRef.current.slice(-80);
  }, []);

  const getTrend = useCallback((last?: number): MetricsTrend => {
    const data = last ? metricsRef.current.slice(-last) : metricsRef.current;
    if (data.length === 0) {
      return { avgDuration: 0, avgConfidence: 0, avgStability: 0, governancePassRate: 1, avgModerations: 0, trend: "stable" };
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avgDuration = avg(data.map(d => d.durationMs));
    const avgConfidence = avg(data.map(d => d.primaryConfidence));
    const avgStability = avg(data.map(d => d.stabilityScore));
    const governancePassRate = data.filter(d => d.governancePassed).length / data.length;
    const avgModerations = avg(data.map(d => d.moderationCount));

    // Determine trend from last 5 vs previous 5
    let trend: MetricsTrend["trend"] = "stable";
    if (data.length >= 10) {
      const recent = data.slice(-5);
      const prior = data.slice(-10, -5);
      const recentStab = avg(recent.map(d => d.stabilityScore));
      const priorStab = avg(prior.map(d => d.stabilityScore));
      if (recentStab > priorStab + 5) trend = "improving";
      else if (recentStab < priorStab - 5) trend = "declining";
    }

    return { avgDuration, avgConfidence, avgStability, governancePassRate, avgModerations, trend };
  }, []);

  const getLatest = useCallback(() => metricsRef.current[metricsRef.current.length - 1] || null, []);

  return { record, getTrend, getLatest, count: metricsRef.current.length };
}

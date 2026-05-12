/**
 * LongitudinalResearchAnalytics — Analyzes longitudinal health data
 * patterns for research insights, cohort analysis, and outcome tracking.
 */
import { useCallback } from "react";

export interface ResearchCohort {
  id: string;
  name: string;
  criteria: string[];
  size: number;
  metrics: CohortMetric[];
  createdAt: number;
}

export interface CohortMetric {
  name: string;
  mean: number;
  median: number;
  std: number;
  trend: "improving" | "stable" | "declining";
  dataPoints: number;
}

export interface ResearchInsight {
  id: string;
  type: "correlation" | "trend" | "anomaly" | "outcome";
  description: string;
  significance: number;
  confidence: number;
  actionable: boolean;
  methodology: string;
}

export function useLongitudinalResearchAnalytics() {
  const analyzeCohort = useCallback((data: { metric: string; values: number[] }[]): CohortMetric[] => {
    return data.map(d => {
      const sorted = [...d.values].sort((a, b) => a - b);
      const mean = d.values.reduce((s, v) => s + v, 0) / d.values.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const std = Math.sqrt(d.values.reduce((s, v) => s + (v - mean) ** 2, 0) / d.values.length);
      const firstHalf = d.values.slice(0, Math.floor(d.values.length / 2));
      const secondHalf = d.values.slice(Math.floor(d.values.length / 2));
      const avgF = firstHalf.reduce((s, v) => s + v, 0) / (firstHalf.length || 1);
      const avgS = secondHalf.reduce((s, v) => s + v, 0) / (secondHalf.length || 1);
      const trend = avgS > avgF * 1.05 ? "improving" as const : avgS < avgF * 0.95 ? "declining" as const : "stable" as const;
      return { name: d.metric, mean, median, std, trend, dataPoints: d.values.length };
    });
  }, []);

  const detectCorrelations = useCallback((metricsA: number[], metricsB: number[]): { correlation: number; significant: boolean } => {
    const n = Math.min(metricsA.length, metricsB.length);
    if (n < 5) return { correlation: 0, significant: false };
    const meanA = metricsA.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const meanB = metricsB.slice(0, n).reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      const dA = metricsA[i] - meanA, dB = metricsB[i] - meanB;
      num += dA * dB; denA += dA * dA; denB += dB * dB;
    }
    const correlation = denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0;
    return { correlation, significant: Math.abs(correlation) > 0.5 && n >= 10 };
  }, []);

  return { analyzeCohort, detectCorrelations };
}

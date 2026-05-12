/**
 * TransparencyEffectivenessAnalyzer — Measures whether the AI's transparency
 * features (showing evidence chains, discarded hypotheses, confidence levels)
 * are actually helping users understand and trust the reasoning.
 */
import { useCallback } from "react";

export interface TransparencyMetric {
  featureName: string;
  viewRate: number;     // % of users who opened/viewed this transparency feature
  helpfulnessScore: number; // 1-5 from user feedback
  correlationWithTrust: number; // -1 to 1
}

export function useTransparencyEffectivenessAnalyzer() {
  const analyzeEffectiveness = useCallback((
    metrics: TransparencyMetric[]
  ) => {
    if (metrics.length === 0) {
      return { overallEffectiveness: 0, mostEffective: null, leastEffective: null };
    }

    const sorted = [...metrics].sort((a, b) => b.correlationWithTrust - a.correlationWithTrust);

    const avgEffectiveness = metrics.reduce((acc, m) => {
      return acc + (m.viewRate * m.helpfulnessScore * (1 + m.correlationWithTrust)) / 10;
    }, 0) / metrics.length;

    return {
      overallEffectiveness: Math.min(100, avgEffectiveness),
      mostEffective: sorted[0].featureName,
      leastEffective: sorted[sorted.length - 1].featureName,
    };
  }, []);

  return { analyzeEffectiveness };
}

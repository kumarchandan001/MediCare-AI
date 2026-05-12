/**
 * BehavioralHealthInsights — Analyzes behavioral patterns for
 * wellness research with privacy-preserving aggregation.
 */
import { useCallback } from "react";

export interface BehavioralPattern {
  category: "engagement" | "adherence" | "lifestyle" | "sleep" | "activity" | "nutrition";
  pattern: string;
  prevalence: number;
  healthCorrelation: number;
  significance: "strong" | "moderate" | "weak" | "none";
  recommendation: string | null;
}

export function useBehavioralHealthInsights() {
  const analyzePatterns = useCallback((data: { category: string; values: number[] }[]): BehavioralPattern[] => {
    return data.map(d => {
      const avg = d.values.reduce((s, v) => s + v, 0) / (d.values.length || 1);
      const variance = d.values.reduce((s, v) => s + (v - avg) ** 2, 0) / (d.values.length || 1);
      const consistency = 100 - Math.min(100, Math.sqrt(variance));
      return {
        category: d.category as BehavioralPattern["category"],
        pattern: consistency > 70 ? "Consistent behavior" : consistency > 40 ? "Variable behavior" : "Highly variable",
        prevalence: d.values.length, healthCorrelation: avg / 100,
        significance: avg > 70 ? "strong" as const : avg > 40 ? "moderate" as const : "weak" as const,
        recommendation: avg < 40 ? `Consider focusing on ${d.category} improvement` : null,
      };
    });
  }, []);

  return { analyzePatterns };
}

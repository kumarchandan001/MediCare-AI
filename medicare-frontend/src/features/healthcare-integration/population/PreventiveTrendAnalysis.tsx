/**
 * PreventiveTrendAnalysis — Analyzes preventive health trends across
 * populations to identify early intervention opportunities.
 */
import { useCallback } from "react";

export interface PreventiveTrend {
  condition: string;
  trendDirection: "increasing" | "stable" | "decreasing";
  rateOfChange: number;
  affectedPopulation: number;
  preventionWindow: "early" | "moderate" | "late" | "passed";
  interventions: { name: string; effectiveness: number; costLevel: string }[];
}

export function usePreventiveTrendAnalysis() {
  const analyzeTrends = useCallback((conditions: { name: string; rates: number[] }[]): PreventiveTrend[] => {
    return conditions.map(c => {
      const firstHalf = c.rates.slice(0, Math.floor(c.rates.length / 2));
      const secondHalf = c.rates.slice(Math.floor(c.rates.length / 2));
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / (firstHalf.length || 1);
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / (secondHalf.length || 1);
      const change = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;
      const direction = change > 0.05 ? "increasing" as const : change < -0.05 ? "decreasing" as const : "stable" as const;
      return {
        condition: c.name, trendDirection: direction, rateOfChange: change,
        affectedPopulation: c.rates[c.rates.length - 1] || 0,
        preventionWindow: avgSecond < 20 ? "early" as const : avgSecond < 50 ? "moderate" as const : "late" as const,
        interventions: [{ name: "Wellness education", effectiveness: 40, costLevel: "low" }, { name: "Screening programs", effectiveness: 65, costLevel: "medium" }],
      };
    });
  }, []);

  return { analyzeTrends };
}

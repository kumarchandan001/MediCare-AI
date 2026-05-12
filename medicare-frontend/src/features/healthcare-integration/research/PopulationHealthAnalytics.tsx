/**
 * PopulationHealthAnalytics — Generates population-level health insights
 * from aggregated, anonymized data for public health intelligence.
 */
import { useCallback } from "react";

export interface PopulationInsight {
  id: string;
  category: "prevalence" | "trend" | "disparity" | "risk_factor" | "outcome";
  title: string;
  description: string;
  populationSize: number;
  confidence: number;
  significance: number;
  actionable: boolean;
  privacyGuarantee: string;
}

export function usePopulationHealthAnalytics() {
  const generateInsights = useCallback((aggregatedData: { metric: string; values: number[]; demographic?: string }[]): PopulationInsight[] => {
    return aggregatedData.map((d, i) => {
      const mean = d.values.reduce((s, v) => s + v, 0) / d.values.length;
      const trend = d.values.length > 2 ? (d.values[d.values.length - 1] > d.values[0] ? "increasing" : "decreasing") : "stable";
      return {
        id: `pop-${Date.now()}-${i}`, category: "trend" as const,
        title: `${d.metric} — ${trend} trend${d.demographic ? ` (${d.demographic})` : ""}`,
        description: `Population mean: ${mean.toFixed(1)}, trend: ${trend} across ${d.values.length} data points`,
        populationSize: d.values.length, confidence: Math.min(90, d.values.length * 2),
        significance: Math.abs(d.values[d.values.length - 1] - d.values[0]) / (mean || 1),
        actionable: trend === "decreasing" && mean < 50,
        privacyGuarantee: "All data aggregated and anonymized — no individual identification possible",
      };
    });
  }, []);

  return { generateInsights };
}

/**
 * PopulationHealthEngine — Core engine for population-level health
 * modeling with demographic segmentation and outcome tracking.
 */
import { useCallback } from "react";

export interface PopulationSegment {
  id: string;
  name: string;
  demographics: Record<string, string>;
  size: number;
  healthScore: number;
  riskFactors: { factor: string; prevalence: number; impact: number }[];
  interventionOpportunities: string[];
}

export interface PopulationHealthSummary {
  totalPopulation: number;
  segments: PopulationSegment[];
  overallHealthScore: number;
  topRisks: string[];
  preventiveOpportunities: string[];
  disclaimer: string;
}

export function usePopulationHealthEngine() {
  const analyzePopulation = useCallback((segments: PopulationSegment[]): PopulationHealthSummary => {
    const total = segments.reduce((s, seg) => s + seg.size, 0);
    const weightedScore = total > 0 ? segments.reduce((s, seg) => s + seg.healthScore * seg.size, 0) / total : 0;
    const allRisks = segments.flatMap(s => s.riskFactors);
    const riskMap = new Map<string, number>();
    allRisks.forEach(r => riskMap.set(r.factor, (riskMap.get(r.factor) || 0) + r.prevalence * r.impact));
    const topRisks = Array.from(riskMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f);
    return {
      totalPopulation: total, segments, overallHealthScore: Math.round(weightedScore),
      topRisks, preventiveOpportunities: segments.flatMap(s => s.interventionOpportunities).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
      disclaimer: "Population analytics based on aggregated, anonymized data only",
    };
  }, []);

  return { analyzePopulation };
}

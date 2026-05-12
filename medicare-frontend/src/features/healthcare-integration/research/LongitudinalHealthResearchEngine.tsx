/**
 * LongitudinalHealthResearchEngine — Enables longitudinal health
 * research with cohort tracking, outcome measurement, and evidence generation.
 */
import { useCallback } from "react";

export interface ResearchCohort {
  id: string;
  name: string;
  criteria: { field: string; operator: string; value: string }[];
  size: number;
  followUpMonths: number;
  outcomes: { metric: string; baseline: number; current: number; change: number }[];
  privacyLevel: "identified" | "pseudonymized" | "anonymized" | "aggregated";
}

export function useLongitudinalHealthResearchEngine() {
  const designCohort = useCallback((name: string, criteria: ResearchCohort["criteria"], followUpMonths: number): ResearchCohort => ({
    id: `cohort-${Date.now()}`, name, criteria, size: 0, followUpMonths,
    outcomes: [], privacyLevel: "anonymized",
  }), []);

  const analyzeOutcomes = useCallback((cohort: ResearchCohort): { significantFindings: string[]; effectSize: number; confidence: number } => {
    const significant = cohort.outcomes.filter(o => Math.abs(o.change) > 10);
    const effectSize = significant.length > 0 ? significant.reduce((s, o) => s + Math.abs(o.change), 0) / significant.length : 0;
    return {
      significantFindings: significant.map(o => `${o.metric}: ${o.change > 0 ? "+" : ""}${o.change.toFixed(1)}% change`),
      effectSize, confidence: Math.min(95, cohort.size > 100 ? 85 : cohort.size > 30 ? 70 : 50),
    };
  }, []);

  return { designCohort, analyzeOutcomes };
}

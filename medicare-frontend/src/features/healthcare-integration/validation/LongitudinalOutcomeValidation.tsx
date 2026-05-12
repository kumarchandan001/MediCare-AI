/**
 * LongitudinalOutcomeValidation — Validates the long-term clinical
 * outcomes of AI-driven health interventions and guidance.
 */
import { useCallback } from "react";

export interface OutcomeValidation {
  interventionType: string;
  casesAnalyzed: number;
  timeframeMonths: number;
  positiveOutcomes: number;
  neutralOutcomes: number;
  negativeOutcomes: number;
  clinicalEfficacy: number;
}

export function useLongitudinalOutcomeValidation() {
  const validateOutcomes = useCallback((interventions: { type: string; outcome: "positive" | "neutral" | "negative" }[]): OutcomeValidation[] => {
    const byType = new Map<string, { type: string; outcome: "positive" | "neutral" | "negative" }[]>();
    interventions.forEach(i => { const arr = byType.get(i.type) || []; arr.push(i); byType.set(i.type, arr); });
    const results: OutcomeValidation[] = [];
    byType.forEach((ints, type) => {
      const pos = ints.filter(i => i.outcome === "positive").length;
      const neu = ints.filter(i => i.outcome === "neutral").length;
      const neg = ints.filter(i => i.outcome === "negative").length;
      results.push({
        interventionType: type, casesAnalyzed: ints.length, timeframeMonths: 12,
        positiveOutcomes: pos, neutralOutcomes: neu, negativeOutcomes: neg,
        clinicalEfficacy: Math.round(((pos + neu * 0.5) / ints.length) * 100),
      });
    });
    return results;
  }, []);

  return { validateOutcomes };
}

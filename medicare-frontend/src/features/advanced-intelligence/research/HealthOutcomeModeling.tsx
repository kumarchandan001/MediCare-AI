/**
 * HealthOutcomeModeling — Models health outcomes based on intervention
 * patterns, adherence data, and longitudinal health trajectories.
 */
import { useCallback } from "react";

export interface OutcomeModel {
  condition: string;
  interventions: { name: string; adherence: number; impactScore: number }[];
  projectedOutcome: "positive" | "neutral" | "negative";
  outcomeScore: number;
  confidenceInterval: [number, number];
  timeHorizonMonths: number;
  keyDrivers: string[];
}

export function useHealthOutcomeModeling() {
  const modelOutcome = useCallback((
    condition: string, interventions: { name: string; adherence: number; expectedImpact: number }[], baselineScore: number
  ): OutcomeModel => {
    const impacts = interventions.map(i => ({
      name: i.name, adherence: i.adherence, impactScore: i.expectedImpact * (i.adherence / 100),
    }));
    const totalImpact = impacts.reduce((s, i) => s + i.impactScore, 0);
    const outcomeScore = Math.max(0, Math.min(100, baselineScore + totalImpact));
    const uncertainty = Math.max(5, 20 - interventions.length * 2);
    const projectedOutcome = outcomeScore > baselineScore + 5 ? "positive" as const : outcomeScore < baselineScore - 5 ? "negative" as const : "neutral" as const;
    const keyDrivers = impacts.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore)).slice(0, 3).map(i => `${i.name} (${i.adherence}% adherence → ${i.impactScore > 0 ? "+" : ""}${i.impactScore.toFixed(1)} impact)`);
    return { condition, interventions: impacts, projectedOutcome, outcomeScore, confidenceInterval: [Math.max(0, outcomeScore - uncertainty), Math.min(100, outcomeScore + uncertainty)], timeHorizonMonths: 6, keyDrivers };
  }, []);

  return { modelOutcome };
}

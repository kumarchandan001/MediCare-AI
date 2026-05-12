/**
 * LongitudinalTrustEvolution — Tracks and fosters the evolution
 * of user trust over the entire lifecycle of the health relationship.
 */
import { useCallback, useRef } from "react";

export interface TrustEvolutionEpoch {
  epochName: string;
  startDate: number;
  endDate: number | null;
  dominantTrustFactors: string[];
  trustLevel: "initial" | "developing" | "established" | "deep" | "wavering" | "recovering";
  quantitativeScore: number;
  criticalIncidents: string[];
}

export function useLongitudinalTrustEvolution() {
  const epochs = useRef<TrustEvolutionEpoch[]>([]);

  const recordEpoch = useCallback((epoch: TrustEvolutionEpoch): void => {
    epochs.current.push(epoch);
  }, []);

  const analyzeTrustTrajectory = useCallback((): { trajectory: string; currentScore: number; stability: number; recommendations: string[] } => {
    const all = epochs.current;
    if (all.length === 0) return { trajectory: "insufficient_data", currentScore: 50, stability: 100, recommendations: [] };
    const currentScore = all[all.length - 1].quantitativeScore;
    const scores = all.map(e => e.quantitativeScore);
    const variance = scores.reduce((s, v) => s + (v - currentScore) ** 2, 0) / scores.length;
    const stability = Math.max(0, 100 - Math.sqrt(variance) * 2);
    const trajectory = scores.length > 1 && scores[scores.length - 1] > scores[0] ? "growing" : scores.length > 1 && scores[scores.length - 1] < scores[0] ? "declining" : "stable";
    const recommendations: string[] = [];
    if (trajectory === "declining") recommendations.push("Prioritize transparency and explicit consent to rebuild trust");
    if (stability < 50) recommendations.push("Trust fluctuates — focus on consistent, predictable health interactions");
    return { trajectory, currentScore, stability, recommendations };
  }, []);

  return { recordEpoch, analyzeTrustTrajectory };
}

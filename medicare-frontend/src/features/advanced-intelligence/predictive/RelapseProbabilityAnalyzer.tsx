/**
 * RelapseProbabilityAnalyzer — Models relapse risk for recovered conditions
 * with time-decay analysis and protective factor scoring.
 */
import { useCallback } from "react";

export interface RelapseAssessment {
  conditionId: string;
  condition: string;
  daysSinceRecovery: number;
  relapseProbability: number;
  riskTrajectory: "decreasing" | "stable" | "increasing";
  protectiveFactors: { factor: string; strength: number }[];
  riskFactors: { factor: string; severity: number }[];
  narrative: string;
  monitoringRecommendation: string;
}

export function useRelapseProbabilityAnalyzer() {
  const assessRelapseRisk = useCallback((
    condition: string, daysSinceRecovery: number,
    protectiveFactors: { factor: string; strength: number }[],
    riskFactors: { factor: string; severity: number }[]
  ): RelapseAssessment => {
    // Time-decay base risk: higher risk early, decreasing over time
    const baseRisk = Math.max(0.02, 0.5 * Math.exp(-daysSinceRecovery / 90));
    const protectiveScore = protectiveFactors.reduce((s, f) => s + f.strength, 0) / Math.max(1, protectiveFactors.length * 100);
    const riskScore = riskFactors.reduce((s, f) => s + f.severity, 0) / Math.max(1, riskFactors.length * 100);
    const adjustedRisk = Math.max(0.01, Math.min(0.95, baseRisk * (1 + riskScore - protectiveScore)));

    let trajectory: RelapseAssessment["riskTrajectory"] = "decreasing";
    if (riskScore > protectiveScore * 1.5) trajectory = "increasing";
    else if (Math.abs(riskScore - protectiveScore) < 0.1 && daysSinceRecovery > 30) trajectory = "stable";

    return {
      conditionId: `relapse-${condition}`, condition, daysSinceRecovery,
      relapseProbability: adjustedRisk, riskTrajectory: trajectory,
      protectiveFactors, riskFactors,
      narrative: generateRelapseNarrative(adjustedRisk, daysSinceRecovery, trajectory),
      monitoringRecommendation: adjustedRisk > 0.3 ? "Increased monitoring recommended — check in daily" : adjustedRisk > 0.15 ? "Regular monitoring — weekly check-ins suggested" : "Maintenance monitoring — continue current routine",
    };
  }, []);

  return { assessRelapseRisk };
}

function generateRelapseNarrative(risk: number, days: number, trajectory: string): string {
  if (risk < 0.1) return `At ${days} days since recovery, your relapse risk is low and ${trajectory === "decreasing" ? "continuing to decrease" : "stable"}. Your recovery foundation looks solid.`;
  if (risk < 0.25) return `Your recovery is progressing well at day ${days}. Some vigilance is still beneficial — the protective habits you've built are working.`;
  return `At day ${days} of recovery, some risk factors warrant attention. This doesn't mean relapse is likely — it means proactive steps now can strengthen your recovery path.`;
}

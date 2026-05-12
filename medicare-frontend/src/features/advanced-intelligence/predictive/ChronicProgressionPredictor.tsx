/**
 * ChronicProgressionPredictor — Models chronic condition progression
 * with stage-aware forecasting and personalized trajectory analysis.
 */
import { useCallback } from "react";

export interface ChronicProgression {
  conditionId: string;
  conditionName: string;
  currentStage: string;
  stageProgression: ProgressionStage[];
  projectedTrajectory: "stable" | "slow_progression" | "moderate_progression" | "rapid_progression" | "improving";
  managementEffectiveness: number; // 0-100
  keyModifiers: ProgressionModifier[];
  narrative: string;
}

export interface ProgressionStage {
  stage: string;
  probability: number;
  timeframeMonths: number | null;
  modifiable: boolean;
}

export interface ProgressionModifier {
  factor: string;
  impact: "protective" | "risk" | "neutral";
  magnitude: number;
  modifiable: boolean;
  recommendation: string | null;
}

export function useChronicProgressionPredictor() {
  const predictProgression = useCallback((
    condition: string, currentStage: string, modifiers: ProgressionModifier[], historyMonths: number
  ): ChronicProgression => {
    const protectiveScore = modifiers.filter(m => m.impact === "protective").reduce((s, m) => s + m.magnitude, 0);
    const riskScore = modifiers.filter(m => m.impact === "risk").reduce((s, m) => s + m.magnitude, 0);
    const netScore = protectiveScore - riskScore;
    let trajectory: ChronicProgression["projectedTrajectory"] = "stable";
    if (netScore > 3) trajectory = "improving";
    else if (netScore < -5) trajectory = "rapid_progression";
    else if (netScore < -2) trajectory = "moderate_progression";
    else if (netScore < 0) trajectory = "slow_progression";
    const managementEffectiveness = Math.max(0, Math.min(100, 50 + netScore * 10));
    const stages: ProgressionStage[] = [
      { stage: currentStage, probability: 1, timeframeMonths: null, modifiable: false },
      { stage: "Next Stage", probability: Math.max(0.05, 0.3 - netScore * 0.05), timeframeMonths: trajectory === "rapid_progression" ? 6 : 18, modifiable: true },
      { stage: "Advanced", probability: Math.max(0.02, 0.15 - netScore * 0.03), timeframeMonths: trajectory === "rapid_progression" ? 18 : 48, modifiable: true },
    ];
    return {
      conditionId: `chronic-${condition}`, conditionName: condition, currentStage, stageProgression: stages,
      projectedTrajectory: trajectory, managementEffectiveness, keyModifiers: modifiers,
      narrative: generateProgressionNarrative(condition, trajectory, managementEffectiveness),
    };
  }, []);

  return { predictProgression };
}

function generateProgressionNarrative(condition: string, trajectory: string, effectiveness: number): string {
  if (trajectory === "improving") return `Your ${condition} management is showing positive results. Current trajectory suggests stabilization or improvement with continued effort.`;
  if (trajectory === "stable") return `Your ${condition} appears stable. Current management strategies are maintaining your health at this level.`;
  if (trajectory === "slow_progression") return `${condition} shows gradual progression, which is common. Your management efforts are helping slow this — every positive choice matters.`;
  return `We're seeing signs of more active ${condition} progression. Adjusting management strategies now can make a significant difference. Consider reviewing your plan with a healthcare provider.`;
}

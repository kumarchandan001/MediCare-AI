/**
 * AdaptiveHealthPlanning — The overarching goal orchestrator that adapts
 * dynamically to the user's current health state. It adjusts the difficulty,
 * focus, and timeline of goals based on whether the user is thriving,
 * recovering, or at risk of burnout.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";
import { useRecoveryGoalTracker, type RecoveryGoal } from "./RecoveryGoalTracker";
import { usePreventiveGoalCoordinator, type PreventiveGoal } from "./PreventiveGoalCoordinator";
import { useWellnessGoalEngine, type WellnessGoal } from "./WellnessGoalEngine";

export type AnyHealthGoal = RecoveryGoal | PreventiveGoal | WellnessGoal;

export interface AdaptivePlan {
  planId: string;
  focusMode: "recovery_first" | "preventive_shield" | "wellness_growth" | "balanced_maintenance";
  activeGoals: AnyHealthGoal[];
  adaptedMessage: string;
}

export function useAdaptiveHealthPlanning() {
  const recoveryEngine = useRecoveryGoalTracker();
  const preventiveEngine = usePreventiveGoalCoordinator();
  const wellnessEngine = useWellnessGoalEngine();

  const generatePlan = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): AdaptivePlan => {
    const recovery = signals.get("recovery");
    const preventiveScore = signals.get("preventive")?.score || 50;

    // Determine the overarching mode
    let focusMode: AdaptivePlan["focusMode"] = "balanced_maintenance";
    
    if (recovery && recovery.score < 60) {
      focusMode = "recovery_first";
    } else if (preventiveScore < 50) {
      focusMode = "preventive_shield";
    } else if (preventiveScore > 75 && (!recovery || recovery.score > 80)) {
      focusMode = "wellness_growth";
    }

    // Fetch potential goals from sub-engines
    const recGoals = recoveryEngine.suggestGoals(signals);
    const prevGoals = preventiveEngine.suggestGoals(signals);
    const wellGoals = wellnessEngine.suggestGoals(signals);

    let activeGoals: AnyHealthGoal[] = [];
    let adaptedMessage = "";

    switch (focusMode) {
      case "recovery_first":
        // Prioritize recovery goals, severely limit others
        activeGoals = [
          ...recGoals.slice(0, 2),
          ...prevGoals.filter((g: PreventiveGoal) => g.urgency === "high").slice(0, 1)
        ];
        adaptedMessage = "Your body is in active recovery. We have scaled back your wellness goals to focus entirely on healing and rest.";
        break;

      case "preventive_shield":
        // Prioritize preventive goals to avoid burnout/illness
        activeGoals = [
          ...prevGoals.slice(0, 2),
          ...wellGoals.filter((g: WellnessGoal) => g.difficulty === "easy").slice(0, 1)
        ];
        adaptedMessage = "We've noticed some preventive warning signs. Your plan is now optimized to protect your energy and prevent burnout.";
        break;

      case "wellness_growth":
        // Push for growth, assuming stable base
        activeGoals = [
          ...wellGoals.slice(0, 3)
        ];
        adaptedMessage = "You have a strong health foundation right now. This is an excellent time to gently push your wellness goals forward.";
        break;

      case "balanced_maintenance":
      default:
        // A mix of easy/moderate goals across domains
        activeGoals = [
          ...(recGoals[0] ? [recGoals[0]] : []),
          ...(prevGoals[0] ? [prevGoals[0]] : []),
          ...(wellGoals[0] ? [wellGoals[0]] : [])
        ];
        adaptedMessage = "Your health is balanced. We've set a mix of maintenance goals to keep you steady without overwhelming you.";
        break;
    }

    // Ensure we don't overwhelm the user (max 3 goals)
    activeGoals = activeGoals.slice(0, 3);

    return {
      planId: `plan-${Date.now()}`,
      focusMode,
      activeGoals,
      adaptedMessage,
    };
  }, [recoveryEngine, preventiveEngine, wellnessEngine]);

  return { generatePlan };
}

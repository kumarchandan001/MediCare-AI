/**
 * PreventiveGoalCoordinator — Suggests goals designed to intercept downward
 * health trends before they become clinical issues (e.g., catching sleep debt,
 * mitigating burnout risk).
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface PreventiveGoal {
  id: string;
  type: "preventive";
  title: string;
  description: string;
  metric: string;
  target: number;
  currentProgress: number;
  urgency: "high" | "medium" | "low";
}

export function usePreventiveGoalCoordinator() {
  const suggestGoals = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): PreventiveGoal[] => {
    const goals: PreventiveGoal[] = [];
    
    const sleep = signals.get("sleep");
    const emotional = signals.get("emotional");

    // Sleep Debt Prevention
    if (sleep && sleep.score < 60 && sleep.trend === "declining") {
      goals.push({
        id: `pg-sleep-${Date.now()}`,
        type: "preventive",
        title: "Intercept Sleep Debt",
        description: "Your sleep trend is dropping. Commit to a 30-minute wind-down routine tonight without screens.",
        metric: "Wind-down routine completed",
        target: 1,
        currentProgress: 0,
        urgency: sleep.score < 40 ? "high" : "medium",
      });
    }

    // Burnout Mitigation
    if (emotional && emotional.score < 50) {
      goals.push({
        id: `pg-burnout-${Date.now()}`,
        type: "preventive",
        title: "Create Breathing Room",
        description: "High stress detected. Schedule two 5-minute 'do nothing' blocks today to regulate your nervous system.",
        metric: "Rest blocks completed",
        target: 2,
        currentProgress: 0,
        urgency: emotional.score < 30 ? "high" : "medium",
      });
    }

    // Hydration baseline
    const nutrition = signals.get("nutrition");
    if (nutrition && nutrition.score < 70) {
      goals.push({
        id: `pg-hydration-${Date.now()}`,
        type: "preventive",
        title: "Baseline Hydration",
        description: "Dehydration mimics fatigue. Drink a glass of water first thing in the morning and before each meal.",
        metric: "Glasses of water",
        target: 4,
        currentProgress: 0,
        urgency: "low",
      });
    }

    return goals.sort((a, b) => {
      const u = { high: 0, medium: 1, low: 2 };
      return u[a.urgency] - u[b.urgency];
    });
  }, []);

  return { suggestGoals };
}

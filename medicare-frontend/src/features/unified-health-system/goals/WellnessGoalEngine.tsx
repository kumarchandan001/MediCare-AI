/**
 * WellnessGoalEngine — Generates goals for users who are currently stable
 * or thriving. Focuses on habit building, fitness maintenance, and overall
 * optimization.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface WellnessGoal {
  id: string;
  type: "wellness";
  title: string;
  description: string;
  metric: string;
  target: number;
  currentProgress: number;
  difficulty: "easy" | "moderate" | "challenging";
}

export function useWellnessGoalEngine() {
  const suggestGoals = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): WellnessGoal[] => {
    const goals: WellnessGoal[] = [];
    
    const activity = signals.get("activity");
    const wellness = signals.get("wellness");

    // Only suggest challenging goals if overall wellness is high
    const isThriving = wellness && wellness.score > 80;

    if (activity && activity.score > 60) {
      goals.push({
        id: `wg-activity-${Date.now()}`,
        type: "wellness",
        title: "Maintain Movement",
        description: "Your activity levels are great. Hit your daily step or movement goal to keep the momentum going.",
        metric: "Active minutes",
        target: 30,
        currentProgress: 0,
        difficulty: "moderate",
      });
    }

    if (isThriving) {
      goals.push({
        id: `wg-challenge-${Date.now()}`,
        type: "wellness",
        title: "Wellness Challenge",
        description: "You're doing exceptionally well. Try adding 10 minutes of strength training or yoga to your routine today.",
        metric: "Bonus activity minutes",
        target: 10,
        currentProgress: 0,
        difficulty: "challenging",
      });
    }

    // Baseline easy habit
    goals.push({
      id: `wg-mindful-${Date.now()}`,
      type: "wellness",
      title: "Mindful Meal",
      description: "Eat one meal today without screens or distractions. This improves digestion and satisfaction.",
      metric: "Mindful meals completed",
      target: 1,
      currentProgress: 0,
      difficulty: "easy",
    });

    return goals;
  }, []);

  return { suggestGoals };
}

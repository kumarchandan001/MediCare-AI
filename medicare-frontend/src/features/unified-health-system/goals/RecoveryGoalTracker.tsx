/**
 * RecoveryGoalTracker — Specializes in creating and tracking goals that are
 * safe and appropriate during active recovery or illness.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface RecoveryGoal {
  id: string;
  type: "recovery";
  title: string;
  description: string;
  metric: string;
  target: number;
  currentProgress: number;
  difficulty: "gentle" | "moderate";
}

export function useRecoveryGoalTracker() {
  const suggestGoals = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): RecoveryGoal[] => {
    const goals: RecoveryGoal[] = [];
    const recovery = signals.get("recovery");
    const medication = signals.get("medication");

    if (!recovery) return goals;

    if (recovery.score < 50) {
      // Radical rest goals
      goals.push({
        id: `rg-rest-${Date.now()}`,
        type: "recovery",
        title: "Radical Rest",
        description: "Commit to designated periods of complete rest (no screens, no work) to allow your body to heal.",
        metric: "Rest periods completed",
        target: 2,
        currentProgress: 0,
        difficulty: "gentle",
      });
    }

    if (medication && medication.score < 80) {
      goals.push({
        id: `rg-meds-${Date.now()}`,
        type: "recovery",
        title: "Medication Consistency",
        description: "Take all prescribed medications on time to support the healing process.",
        metric: "On-time doses today",
        target: 100, // percentage
        currentProgress: medication.score,
        difficulty: "gentle",
      });
    }

    if (recovery.score >= 50 && recovery.trend === "improving") {
      // Gentle reintroduction
      goals.push({
        id: `rg-movement-${Date.now()}`,
        type: "recovery",
        title: "Gentle Reintroduction",
        description: "A short, low-intensity walk to gently reawaken the body without causing a setback.",
        metric: "Minutes of gentle movement",
        target: 10,
        currentProgress: 0,
        difficulty: "moderate",
      });
    }

    return goals;
  }, []);

  return { suggestGoals };
}

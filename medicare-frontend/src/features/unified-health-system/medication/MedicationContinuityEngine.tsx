/**
 * MedicationContinuityEngine — Tracks medication adherence over time,
 * handles consent checks, predicts adherence drop-off risks, and calculates
 * the overall medication continuity score.
 */
import { useCallback } from "react";

export interface MedicationSchedule {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: "daily" | "twice_daily" | "weekly" | "as_needed";
  timeOfDay?: string[];
  startDate: number;
  endDate?: number;
}

export interface AdherenceLog {
  scheduleId: string;
  timestamp: number;
  status: "taken" | "missed" | "skipped_intentionally" | "late";
}

export interface ContinuityAssessment {
  overallAdherenceScore: number; // 0-100
  recentAdherenceScore: number;  // 0-100 (last 7 days)
  riskOfDropOff: "low" | "moderate" | "high";
  riskFactors: string[];
  narrative: string;
  actionableFeedback: string;
}

export function useMedicationContinuity() {
  const assess = useCallback((
    schedules: MedicationSchedule[],
    logs: AdherenceLog[],
    consentGiven: boolean
  ): ContinuityAssessment | null => {
    if (!consentGiven) return null;
    if (schedules.length === 0) {
      return {
        overallAdherenceScore: 100,
        recentAdherenceScore: 100,
        riskOfDropOff: "low",
        riskFactors: [],
        narrative: "No active medications tracked.",
        actionableFeedback: "Add medications to begin tracking continuity.",
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86_400_000;
    
    // Calculate total expected doses vs taken (simplified)
    const recentLogs = logs.filter(l => l.timestamp >= sevenDaysAgo);
    let takenRecent = 0;
    let expectedRecent = 0;

    for (const schedule of schedules) {
      if (schedule.frequency === "daily") expectedRecent += 7;
      if (schedule.frequency === "twice_daily") expectedRecent += 14;
      if (schedule.frequency === "weekly") expectedRecent += 1;
    }

    // This is a simplified calculation for expected doses vs taken
    takenRecent = recentLogs.filter(l => l.status === "taken" || l.status === "late").length;
    
    const recentAdherenceScore = expectedRecent > 0 
      ? Math.min(100, Math.round((takenRecent / expectedRecent) * 100))
      : 100;

    // Determine risk of drop-off
    let riskOfDropOff: ContinuityAssessment["riskOfDropOff"] = "low";
    const riskFactors: string[] = [];

    if (recentAdherenceScore < 50) {
      riskOfDropOff = "high";
      riskFactors.push("Significant missed doses in the last 7 days.");
    } else if (recentAdherenceScore < 80) {
      riskOfDropOff = "moderate";
      riskFactors.push("Occasional missed doses detected.");
    }

    // Analyze schedule complexity
    if (schedules.length > 3) {
      if (riskOfDropOff === "low") riskOfDropOff = "moderate";
      riskFactors.push("Complex medication regimen (4+ medications) increases risk of fatigue.");
    }

    let narrative = "";
    let actionableFeedback = "";

    if (riskOfDropOff === "low") {
      narrative = "Medication adherence is strong. Your consistency is directly supporting your health goals.";
      actionableFeedback = "Keep up the great work with your current routine.";
    } else if (riskOfDropOff === "moderate") {
      narrative = "There's a slight drop in medication consistency recently. Consistent timing is key to effectiveness.";
      actionableFeedback = "Consider setting a daily alarm or linking medication to an existing habit like morning coffee.";
    } else {
      narrative = "Medication continuity has been low recently. Gaps in medication can significantly impact recovery and disease management.";
      actionableFeedback = "If side effects or schedule complexity are causing missed doses, please discuss with your healthcare provider.";
    }

    return {
      overallAdherenceScore: recentAdherenceScore, // Simplified for now
      recentAdherenceScore,
      riskOfDropOff,
      riskFactors,
      narrative,
      actionableFeedback,
    };
  }, []);

  return { assess };
}

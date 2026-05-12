/**
 * BurnoutPredictionLayer — Predicts burnout risk from stress trends,
 * sleep debt, activity decline, and work pattern indicators. Produces
 * burnout risk scores with timeline projections.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface BurnoutPrediction {
  riskScore: number;           // 0-100
  riskLevel: "low" | "moderate" | "high" | "critical";
  trajectory: "stable" | "rising" | "accelerating" | "declining" | "insufficient_data";
  predictedDaysToThreshold: number | null;
  contributingFactors: BurnoutFactor[];
  protectiveFactors: string[];
  narrative: string;
  weeklyTrend: number[];       // Last 4 weeks risk scores
  interventions: BurnoutIntervention[];
}

export interface BurnoutFactor {
  factor: string;
  domain: HealthDomain;
  weight: number;       // 0-1
  currentValue: number; // 0-100 (inverted: higher = worse)
  description: string;
}

export interface BurnoutIntervention {
  priority: "immediate" | "this_week" | "ongoing";
  action: string;
  expectedImpact: "high" | "moderate" | "gradual";
  domain: HealthDomain;
}

export function useBurnoutPrediction() {
  const predict = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    weeklyHistory?: { week: number; stressScore: number; sleepScore: number; activityScore: number }[]
  ): BurnoutPrediction => {
    const stress = signals.get("emotional");
    const sleep = signals.get("sleep");
    const activity = signals.get("activity");
    const recovery = signals.get("recovery");
    const wellness = signals.get("wellness");

    const factors: BurnoutFactor[] = [];
    const protectiveFactors: string[] = [];
    const interventions: BurnoutIntervention[] = [];

    // ── Stress Factor (40% weight) ──
    const stressValue = stress ? 100 - stress.score : 50;
    factors.push({
      factor: "Stress Level", domain: "emotional", weight: 0.40,
      currentValue: stressValue,
      description: stressValue > 70 ? "Persistently high stress is a primary burnout driver." :
        stressValue > 50 ? "Moderate stress — manageable but worth monitoring." :
        "Stress levels are well-managed.",
    });
    if (stressValue < 30) protectiveFactors.push("Well-managed stress levels");

    // ── Sleep Debt Factor (30% weight) ──
    const sleepDebt = sleep ? 100 - sleep.score : 50;
    factors.push({
      factor: "Sleep Debt", domain: "sleep", weight: 0.30,
      currentValue: sleepDebt,
      description: sleepDebt > 60 ? "Accumulated sleep debt significantly increases burnout vulnerability." :
        sleepDebt > 40 ? "Some sleep deficit — improving sleep would help resilience." :
        "Sleep quality is supporting recovery.",
    });
    if (sleepDebt < 30) protectiveFactors.push("Good sleep quality");

    // ── Activity Decline Factor (15% weight) ──
    const activityDeficit = activity ? 100 - activity.score : 50;
    factors.push({
      factor: "Activity Decline", domain: "activity", weight: 0.15,
      currentValue: activityDeficit,
      description: activityDeficit > 70 ? "Very low activity levels reduce stress resilience and mood." :
        "Activity levels are adequate for maintaining resilience.",
    });
    if (activityDeficit < 30) protectiveFactors.push("Active lifestyle");

    // ── Recovery Strain Factor (15% weight) ──
    const recoveryStrain = recovery ? 100 - recovery.score : 40;
    factors.push({
      factor: "Recovery Strain", domain: "recovery", weight: 0.15,
      currentValue: recoveryStrain,
      description: recoveryStrain > 60 ? "Ongoing recovery demands are adding to overall burden." :
        "Recovery is not adding significant strain.",
    });

    // ── Compute Risk Score ──
    const riskScore = Math.round(
      factors.reduce((sum, f) => sum + f.currentValue * f.weight, 0)
    );

    let riskLevel: BurnoutPrediction["riskLevel"];
    if (riskScore >= 75) riskLevel = "critical";
    else if (riskScore >= 55) riskLevel = "high";
    else if (riskScore >= 35) riskLevel = "moderate";
    else riskLevel = "low";

    // ── Weekly Trend ──
    let weeklyTrend: number[] = [];
    let trajectory: BurnoutPrediction["trajectory"] = "insufficient_data";

    if (weeklyHistory && weeklyHistory.length >= 2) {
      weeklyTrend = weeklyHistory.map(w => {
        const s = 100 - w.stressScore;
        const sl = 100 - w.sleepScore;
        const a = 100 - w.activityScore;
        return Math.round(s * 0.4 + sl * 0.3 + a * 0.15 + 40 * 0.15);
      });

      const recent = weeklyTrend.slice(-2);
      const earlier = weeklyTrend.slice(0, 2);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

      if (recentAvg > earlierAvg + 15) trajectory = "accelerating";
      else if (recentAvg > earlierAvg + 5) trajectory = "rising";
      else if (recentAvg < earlierAvg - 5) trajectory = "declining";
      else trajectory = "stable";
    }

    // ── Predicted Days to Threshold ──
    let predictedDaysToThreshold: number | null = null;
    if (trajectory === "rising" && riskScore < 75) {
      predictedDaysToThreshold = Math.round((75 - riskScore) / 3 * 7);
    } else if (trajectory === "accelerating" && riskScore < 75) {
      predictedDaysToThreshold = Math.round((75 - riskScore) / 5 * 7);
    }

    // ── Interventions ──
    if (stressValue > 60) {
      interventions.push({
        priority: "immediate", action: "Take a 10-minute break with deep breathing.",
        expectedImpact: "moderate", domain: "emotional",
      });
      interventions.push({
        priority: "this_week", action: "Identify and reduce one source of unnecessary stress.",
        expectedImpact: "high", domain: "emotional",
      });
    }
    if (sleepDebt > 50) {
      interventions.push({
        priority: "this_week", action: "Establish a consistent 30-minute wind-down routine before bed.",
        expectedImpact: "high", domain: "sleep",
      });
    }
    if (activityDeficit > 60) {
      interventions.push({
        priority: "ongoing", action: "Add 15 minutes of gentle movement to your daily routine.",
        expectedImpact: "gradual", domain: "activity",
      });
    }

    // ── Narrative ──
    const narrativeMap: Record<string, string> = {
      low: "Your burnout risk is low. Your current lifestyle choices are building good resilience reserves.",
      moderate: "There are early signs of accumulating strain. Small proactive adjustments now can prevent escalation.",
      high: "Your burnout indicators are elevated. This is a signal to prioritize rest, boundaries, and self-care.",
      critical: "Multiple burnout indicators are in the red zone. Please consider this a priority — your wellbeing matters, and recovery is possible with the right support.",
    };

    return {
      riskScore, riskLevel, trajectory, predictedDaysToThreshold,
      contributingFactors: factors, protectiveFactors,
      narrative: narrativeMap[riskLevel],
      weeklyTrend, interventions,
    };
  }, []);

  return { predict };
}

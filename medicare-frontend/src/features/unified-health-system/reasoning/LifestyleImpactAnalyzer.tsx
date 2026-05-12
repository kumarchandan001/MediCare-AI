/**
 * LifestyleImpactAnalyzer — Analyzes how lifestyle factors (activity,
 * nutrition, stress, sleep) influence clinical reasoning. Produces
 * impact scores and narratives for each active investigation.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface LifestyleImpact {
  factor: string;
  domain: HealthDomain;
  impactType: "amplifying" | "mitigating" | "neutral";
  magnitude: number;      // 0-100
  confidence: number;     // 0-100
  narrative: string;
  recommendation?: string;
}

export interface LifestyleProfile {
  overallLifestyleScore: number;
  impacts: LifestyleImpact[];
  dominantFactors: string[];
  investigationModifiers: {
    confidenceAdjustment: number;
    escalationModifier: number;
    recoveryModifier: number;
  };
  summary: string;
}

export function useLifestyleImpactAnalyzer() {
  const analyze = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    investigationContext?: { condition: string; confidence: number; symptoms: string[] }
  ): LifestyleProfile => {
    const impacts: LifestyleImpact[] = [];
    const dominantFactors: string[] = [];

    const sleep = signals.get("sleep");
    const activity = signals.get("activity");
    const nutrition = signals.get("nutrition");
    const emotional = signals.get("emotional");

    // ── Sleep Impact ──
    if (sleep) {
      if (sleep.score < 35) {
        impacts.push({
          factor: "Poor Sleep Quality", domain: "sleep",
          impactType: "amplifying", magnitude: 70, confidence: 75,
          narrative: "Consistently poor sleep is likely amplifying symptom severity and slowing recovery processes.",
          recommendation: "Focus on sleep hygiene: consistent bedtime, dark room, no screens 1 hour before bed.",
        });
        dominantFactors.push("sleep_deficit");
      } else if (sleep.score > 75) {
        impacts.push({
          factor: "Strong Sleep Quality", domain: "sleep",
          impactType: "mitigating", magnitude: 60, confidence: 70,
          narrative: "Your good sleep quality is supporting your body's healing and immune function.",
        });
      } else {
        impacts.push({
          factor: "Adequate Sleep", domain: "sleep",
          impactType: "neutral", magnitude: 20, confidence: 50,
          narrative: "Your sleep quality is adequate and unlikely to significantly affect your health assessment.",
        });
      }
    }

    // ── Activity Impact ──
    if (activity) {
      if (activity.score < 25) {
        impacts.push({
          factor: "Low Physical Activity", domain: "activity",
          impactType: "amplifying", magnitude: 50, confidence: 60,
          narrative: "Very low activity levels may be contributing to fatigue and reduced cardiovascular fitness.",
          recommendation: "Even 15 minutes of gentle walking daily can meaningfully improve energy levels.",
        });
        dominantFactors.push("sedentary");
      } else if (activity.score > 80) {
        impacts.push({
          factor: "High Activity Level", domain: "activity",
          impactType: "mitigating", magnitude: 55, confidence: 65,
          narrative: "Your active lifestyle is supporting overall health resilience.",
        });
      }
    }

    // ── Nutrition Impact ──
    if (nutrition) {
      if (nutrition.score < 35) {
        impacts.push({
          factor: "Poor Nutrition", domain: "nutrition",
          impactType: "amplifying", magnitude: 45, confidence: 50,
          narrative: "Suboptimal nutrition may be limiting your body's ability to recover and resist illness.",
          recommendation: "Focus on regular, balanced meals — even small improvements compound over time.",
        });
        dominantFactors.push("poor_nutrition");
      }
    }

    // ── Emotional/Stress Impact ──
    if (emotional) {
      if (emotional.score < 30) {
        impacts.push({
          factor: "High Stress", domain: "emotional",
          impactType: "amplifying", magnitude: 65, confidence: 70,
          narrative: "Elevated stress is a significant factor — it can amplify symptom perception, disrupt sleep, and slow recovery.",
          recommendation: "Consider stress-reduction techniques: deep breathing, short walks, or speaking with someone you trust.",
        });
        dominantFactors.push("high_stress");
      } else if (emotional.score > 70) {
        impacts.push({
          factor: "Good Emotional Balance", domain: "emotional",
          impactType: "mitigating", magnitude: 50, confidence: 60,
          narrative: "Your emotional wellbeing is stable, which supports clear symptom assessment and recovery.",
        });
      }
    }

    // ── Compute Investigation Modifiers ──
    const amplifyingImpacts = impacts.filter(i => i.impactType === "amplifying");
    const mitigatingImpacts = impacts.filter(i => i.impactType === "mitigating");

    const avgAmplification = amplifyingImpacts.length > 0
      ? amplifyingImpacts.reduce((sum, i) => sum + i.magnitude, 0) / amplifyingImpacts.length
      : 0;
    const avgMitigation = mitigatingImpacts.length > 0
      ? mitigatingImpacts.reduce((sum, i) => sum + i.magnitude, 0) / mitigatingImpacts.length
      : 0;

    // Confidence adjustment: lifestyle factors can reduce certainty
    const confidenceAdjustment = amplifyingImpacts.length > 2 ? -5 : mitigatingImpacts.length > 2 ? 3 : 0;

    // Escalation modifier: severe lifestyle issues may warrant attention
    const escalationModifier = avgAmplification > 60 ? 0.1 : avgMitigation > 60 ? -0.05 : 0;

    // Recovery modifier: lifestyle strongly influences recovery
    const recoveryModifier = (avgMitigation - avgAmplification) / 100;

    // Overall lifestyle score
    const lifestyleScores = [sleep?.score, activity?.score, nutrition?.score, emotional?.score].filter(Boolean) as number[];
    const overallLifestyleScore = lifestyleScores.length > 0
      ? Math.round(lifestyleScores.reduce((s, v) => s + v, 0) / lifestyleScores.length)
      : 50;

    // Summary
    let summary: string;
    if (overallLifestyleScore >= 70) {
      summary = "Your lifestyle factors are generally supportive of good health. This provides a positive foundation for any health investigation.";
    } else if (overallLifestyleScore >= 45) {
      summary = "Your lifestyle is mixed — some factors are helpful while others could be improved. Small adjustments in key areas could meaningfully support your health.";
    } else {
      summary = "Several lifestyle factors may be affecting your health. Addressing even one or two of these areas could lead to noticeable improvements.";
    }

    return {
      overallLifestyleScore,
      impacts,
      dominantFactors,
      investigationModifiers: { confidenceAdjustment, escalationModifier, recoveryModifier },
      summary,
    };
  }, []);

  return { analyze };
}

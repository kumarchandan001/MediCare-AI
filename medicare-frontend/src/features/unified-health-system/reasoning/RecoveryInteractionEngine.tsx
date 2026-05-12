/**
 * RecoveryInteractionEngine — Models how recovery status interacts with
 * new symptom reports, wearable trends, and medication adherence.
 * Produces recovery-adjusted confidence modifiers.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface RecoveryInteraction {
  interactionType: string;
  sourceDomain: HealthDomain;
  effect: "supporting" | "hindering" | "neutral";
  magnitude: number;     // 0-100
  narrative: string;
}

export interface RecoveryAssessment {
  recoveryScore: number;
  recoveryTrend: "accelerating" | "steady" | "stalling" | "regressing" | "unknown";
  interactions: RecoveryInteraction[];
  confidenceModifier: number;  // -15 to +15
  riskOfRelapse: number;       // 0-100
  supportiveNarrative: string;
  recommendations: string[];
}

export function useRecoveryInteractionEngine() {
  const assess = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    recoveryContext?: { daysInRecovery: number; originalCondition: string; originalSeverity: number }
  ): RecoveryAssessment => {
    const interactions: RecoveryInteraction[] = [];
    const recommendations: string[] = [];

    const recovery = signals.get("recovery");
    const sleep = signals.get("sleep");
    const medication = signals.get("medication");
    const activity = signals.get("activity");
    const emotional = signals.get("emotional");
    const wearable = signals.get("wearable");
    const nutrition = signals.get("nutrition");

    const recoveryScore = recovery?.score || 50;
    let confidenceModifier = 0;
    let relapseRisk = 20; // baseline

    // ── Sleep-Recovery Interaction ──
    if (sleep) {
      if (sleep.score < 35) {
        interactions.push({
          interactionType: "sleep_deficit_recovery",
          sourceDomain: "sleep",
          effect: "hindering",
          magnitude: 65,
          narrative: "Poor sleep quality is likely slowing your recovery. The body does its deepest healing during quality sleep.",
        });
        confidenceModifier -= 5;
        relapseRisk += 15;
        recommendations.push("Prioritize sleep quality — aim for 7-8 hours in a dark, quiet environment.");
      } else if (sleep.score > 70) {
        interactions.push({
          interactionType: "sleep_supporting_recovery",
          sourceDomain: "sleep",
          effect: "supporting",
          magnitude: 60,
          narrative: "Good sleep is actively supporting your recovery — your body is getting the rest it needs to heal.",
        });
        confidenceModifier += 3;
        relapseRisk -= 5;
      }
    }

    // ── Medication-Recovery Interaction ──
    if (medication) {
      if (medication.score > 75) {
        interactions.push({
          interactionType: "medication_adherence_positive",
          sourceDomain: "medication",
          effect: "supporting",
          magnitude: 70,
          narrative: "Consistent medication adherence is strongly supporting your recovery trajectory.",
        });
        confidenceModifier += 5;
        relapseRisk -= 10;
      } else if (medication.score < 40) {
        interactions.push({
          interactionType: "medication_gaps",
          sourceDomain: "medication",
          effect: "hindering",
          magnitude: 60,
          narrative: "Gaps in medication adherence may be affecting your recovery progress. Consistency is key.",
        });
        confidenceModifier -= 5;
        relapseRisk += 20;
        recommendations.push("Try to maintain consistent medication timing — set a daily reminder if helpful.");
      }
    }

    // ── Activity-Recovery Balance ──
    if (activity) {
      if (activity.score > 85 && recoveryScore < 60) {
        interactions.push({
          interactionType: "overexertion_risk",
          sourceDomain: "activity",
          effect: "hindering",
          magnitude: 55,
          narrative: "High activity while still recovering may be counterproductive. Your body needs energy for healing.",
        });
        relapseRisk += 10;
        recommendations.push("Consider reducing exercise intensity until recovery stabilizes.");
      } else if (activity.score > 40 && activity.score < 70 && recoveryScore > 40) {
        interactions.push({
          interactionType: "moderate_activity_recovery",
          sourceDomain: "activity",
          effect: "supporting",
          magnitude: 45,
          narrative: "Moderate activity is supporting your recovery — gentle movement helps circulation and mood.",
        });
      }
    }

    // ── Emotional-Recovery Interaction ──
    if (emotional) {
      if (emotional.score < 35) {
        interactions.push({
          interactionType: "stress_impeding_recovery",
          sourceDomain: "emotional",
          effect: "hindering",
          magnitude: 50,
          narrative: "Elevated stress can slow recovery by diverting your body's resources. Your mental wellbeing matters for physical healing.",
        });
        relapseRisk += 10;
        recommendations.push("Gentle relaxation practices can support both emotional and physical recovery.");
      }
    }

    // ── Wearable Trend Validation ──
    if (wearable && wearable.confidence > 60) {
      if (wearable.trend === "improving") {
        interactions.push({
          interactionType: "wearable_positive_trend",
          sourceDomain: "wearable",
          effect: "supporting",
          magnitude: 40,
          narrative: "Your wearable data shows improving vital trends, which aligns with positive recovery signals.",
        });
        confidenceModifier += 2;
      } else if (wearable.trend === "declining") {
        interactions.push({
          interactionType: "wearable_concerning_trend",
          sourceDomain: "wearable",
          effect: "hindering",
          magnitude: 45,
          narrative: "Some wearable indicators are showing concerning trends — we're monitoring these closely.",
        });
        confidenceModifier -= 3;
        relapseRisk += 5;
      }
    }

    // ── Determine Recovery Trend ──
    const supportingCount = interactions.filter(i => i.effect === "supporting").length;
    const hinderingCount = interactions.filter(i => i.effect === "hindering").length;
    let recoveryTrend: RecoveryAssessment["recoveryTrend"];

    if (recovery?.trend === "unknown" || !recovery) {
      recoveryTrend = "unknown";
    } else if (supportingCount > hinderingCount + 1) {
      recoveryTrend = "accelerating";
    } else if (hinderingCount > supportingCount + 1) {
      recoveryTrend = "stalling";
    } else if (recoveryScore < 30 && hinderingCount > 0) {
      recoveryTrend = "regressing";
    } else {
      recoveryTrend = "steady";
    }

    // ── Supportive Narrative ──
    const narrativeMap: Record<string, string> = {
      accelerating: "Your recovery is progressing well — multiple health factors are working together in your favor. Keep it up!",
      steady: "Your recovery is on track. Maintaining your current habits will continue to support healing.",
      stalling: "Your recovery has slowed a bit. This is normal — let's look at what adjustments might help things move forward.",
      regressing: "We're noticing some setback signals. This can happen during recovery. Let's focus on the adjustable factors.",
      unknown: "We're monitoring your recovery as data comes in. Early patterns will help us guide your journey.",
    };

    return {
      recoveryScore,
      recoveryTrend,
      interactions,
      confidenceModifier: Math.max(-15, Math.min(15, confidenceModifier)),
      riskOfRelapse: Math.max(0, Math.min(100, relapseRisk)),
      supportiveNarrative: narrativeMap[recoveryTrend],
      recommendations,
    };
  }, []);

  return { assess };
}

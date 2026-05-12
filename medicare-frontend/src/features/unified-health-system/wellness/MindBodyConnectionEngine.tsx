/**
 * MindBodyConnectionEngine — Explicitly correlates mental health signals
 * (emotional, coaching) with physical signals (disease_intelligence,
 * recovery, wearable) to identify somatic connections (e.g., stress
 * inducing physical symptoms).
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface MindBodyInsight {
  id: string;
  type: "stress_symptom" | "mood_energy" | "anxiety_vitals" | "positive_spiral";
  confidence: number;
  description: string;
  actionableAdvice: string;
}

export function useMindBodyConnectionEngine() {
  const analyze = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): MindBodyInsight[] => {
    const insights: MindBodyInsight[] = [];
    const emotional = signals.get("emotional");
    const physical = signals.get("disease_intelligence") || signals.get("recovery");
    const wearable = signals.get("wearable");
    const activity = signals.get("activity");

    if (!emotional) return insights;

    // Stress causing physical symptoms or stalling recovery
    if (emotional.score < 40 && physical && physical.trend === "declining") {
      insights.push({
        id: `mb-stress-symptom-${Date.now()}`,
        type: "stress_symptom",
        confidence: 75,
        description: "Your elevated stress levels appear to be directly impacting your physical recovery or symptom severity.",
        actionableAdvice: "Prioritizing stress reduction techniques right now may be just as important as physical treatments.",
      });
    }

    // Mood and Energy (Activity) Correlation
    if (emotional.score < 50 && activity && activity.score < 40) {
      insights.push({
        id: `mb-mood-energy-${Date.now()}`,
        type: "mood_energy",
        confidence: 80,
        description: "Low emotional wellbeing is correlating strongly with reduced physical activity and energy levels.",
        actionableAdvice: "Sometimes a short, gentle walk can help break the cycle of low mood and low energy.",
      });
    }

    // Anxiety and Wearable Vitals (e.g., HR)
    if (emotional.score < 30 && wearable && wearable.trend === "declining") {
      // Assuming 'declining' wearable means worse vitals (e.g., higher resting HR)
      insights.push({
        id: `mb-anxiety-vitals-${Date.now()}`,
        type: "anxiety_vitals",
        confidence: 70,
        description: "Your wearable data shows physiological signs of stress (like elevated heart rate) matching your emotional check-ins.",
        actionableAdvice: "Try a 5-minute deep breathing exercise to help calm your nervous system.",
      });
    }

    // Positive Spiral
    if (emotional.score > 80 && physical && physical.score > 70 && physical.trend === "improving") {
      insights.push({
        id: `mb-positive-spiral-${Date.now()}`,
        type: "positive_spiral",
        confidence: 85,
        description: "Your positive emotional state is creating a powerful environment for physical healing and wellbeing.",
        actionableAdvice: "Notice what's working well for your mood right now and keep it up—it's helping your body thrive.",
      });
    }

    return insights;
  }, []);

  return { analyze };
}

/**
 * EmotionalAdaptationFramework — Adapts AI communication based on
 * detected emotional state, stress levels, and emotional history.
 */
import { useCallback } from "react";

export interface EmotionalState {
  primaryEmotion: "calm" | "anxious" | "stressed" | "hopeful" | "frustrated" | "neutral" | "fearful";
  intensity: number;
  confidence: number;
  triggers: string[];
  timestamp: number;
}

export interface EmotionalAdaptation {
  toneAdjustment: "warmer" | "calmer" | "more_direct" | "more_reassuring" | "neutral";
  languageLevel: "simplified" | "standard" | "detailed";
  urgencyModulation: "reduce" | "maintain" | "increase";
  empathyLevel: "high" | "moderate" | "standard";
  avoidTopics: string[];
  emphasizeTopics: string[];
}

export function useEmotionalAdaptationFramework() {
  const adaptToEmotion = useCallback((state: EmotionalState): EmotionalAdaptation => {
    if (state.primaryEmotion === "anxious" || state.primaryEmotion === "fearful") {
      return { toneAdjustment: "calmer", languageLevel: "simplified", urgencyModulation: "reduce", empathyLevel: "high", avoidTopics: ["risk_statistics", "worst_case"], emphasizeTopics: ["what_you_can_control", "support_available"] };
    }
    if (state.primaryEmotion === "stressed") {
      return { toneAdjustment: "warmer", languageLevel: "simplified", urgencyModulation: "reduce", empathyLevel: "high", avoidTopics: ["additional_tasks"], emphasizeTopics: ["progress_made", "small_wins"] };
    }
    if (state.primaryEmotion === "frustrated") {
      return { toneAdjustment: "more_direct", languageLevel: "standard", urgencyModulation: "maintain", empathyLevel: "moderate", avoidTopics: ["repetitive_advice"], emphasizeTopics: ["concrete_actions", "new_approaches"] };
    }
    if (state.primaryEmotion === "hopeful") {
      return { toneAdjustment: "warmer", languageLevel: "standard", urgencyModulation: "maintain", empathyLevel: "moderate", avoidTopics: [], emphasizeTopics: ["progress", "next_steps", "goals"] };
    }
    return { toneAdjustment: "neutral", languageLevel: "standard", urgencyModulation: "maintain", empathyLevel: "standard", avoidTopics: [], emphasizeTopics: [] };
  }, []);

  const detectEmotionalShift = useCallback((history: EmotionalState[]): { shifted: boolean; direction: "improving" | "declining" | "stable"; narrative: string } => {
    if (history.length < 3) return { shifted: false, direction: "stable", narrative: "Building emotional context" };
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    if (older.length === 0) return { shifted: false, direction: "stable", narrative: "Gathering baseline" };
    const recentAvg = recent.reduce((s, e) => s + e.intensity, 0) / recent.length;
    const olderAvg = older.reduce((s, e) => s + e.intensity, 0) / older.length;
    const negativeEmotions = ["anxious", "stressed", "frustrated", "fearful"];
    const recentNeg = recent.filter(e => negativeEmotions.includes(e.primaryEmotion)).length;
    const olderNeg = older.filter(e => negativeEmotions.includes(e.primaryEmotion)).length;
    if (recentNeg < olderNeg) return { shifted: true, direction: "improving", narrative: "Your emotional state appears to be improving" };
    if (recentNeg > olderNeg) return { shifted: true, direction: "declining", narrative: "We notice you may be experiencing more stress lately" };
    return { shifted: false, direction: "stable", narrative: "Emotional patterns remain consistent" };
  }, []);

  return { adaptToEmotion, detectEmotionalShift };
}

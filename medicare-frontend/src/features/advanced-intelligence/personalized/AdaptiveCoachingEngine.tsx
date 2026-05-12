/**
 * AdaptiveCoachingEngine — Personalizes health coaching strategies
 * based on user responsiveness, motivation patterns, and progress history.
 */
import { useCallback } from "react";

export interface CoachingStrategy {
  style: "motivational" | "educational" | "accountability" | "gentle_reminder" | "celebratory";
  intensity: "light" | "moderate" | "focused";
  frequency: "daily" | "few_times_week" | "weekly" | "as_needed";
  preferredTime: "morning" | "afternoon" | "evening" | "adaptive";
  focusAreas: string[];
}

export interface CoachingEffectiveness {
  strategyUsed: string;
  userEngagement: number;
  goalProgress: number;
  userSatisfaction: number | null;
  effectivenessScore: number;
}

export function useAdaptiveCoachingEngine() {
  const selectStrategy = useCallback((
    engagement: number, recentProgress: number, stressLevel: number, preferences: Partial<CoachingStrategy>
  ): CoachingStrategy => {
    let style: CoachingStrategy["style"] = "motivational";
    if (recentProgress > 70) style = "celebratory";
    else if (engagement < 30) style = "gentle_reminder";
    else if (stressLevel > 70) style = "gentle_reminder";
    else if (engagement > 70 && recentProgress < 40) style = "accountability";
    let intensity: CoachingStrategy["intensity"] = "moderate";
    if (stressLevel > 60 || engagement < 30) intensity = "light";
    else if (engagement > 70 && recentProgress > 50) intensity = "focused";
    return {
      style, intensity,
      frequency: preferences.frequency || (engagement > 50 ? "few_times_week" : "weekly"),
      preferredTime: preferences.preferredTime || "adaptive",
      focusAreas: preferences.focusAreas || ["overall_wellness"],
    };
  }, []);

  const evaluateEffectiveness = useCallback((history: CoachingEffectiveness[]): {
    bestStrategy: string | null; worstStrategy: string | null; overallEffectiveness: number;
    recommendation: string;
  } => {
    if (history.length < 3) return { bestStrategy: null, worstStrategy: null, overallEffectiveness: 50, recommendation: "Continue gathering coaching interaction data for personalization" };
    const byStrategy = new Map<string, number[]>();
    history.forEach(h => { const arr = byStrategy.get(h.strategyUsed) || []; arr.push(h.effectivenessScore); byStrategy.set(h.strategyUsed, arr); });
    let best: { name: string; score: number } | null = null;
    let worst: { name: string; score: number } | null = null;
    byStrategy.forEach((scores, name) => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (!best || avg > best.score) best = { name, score: avg };
      if (!worst || avg < worst.score) worst = { name, score: avg };
    });
    const overall = history.reduce((s, h) => s + h.effectivenessScore, 0) / history.length;
    const bestResult = best as { name: string; score: number } | null;
    const worstResult = worst as { name: string; score: number } | null;
    return {
      bestStrategy: bestResult?.name || null, worstStrategy: worstResult?.name || null,
      overallEffectiveness: overall,
      recommendation: overall > 70 ? "Current coaching approach is working well" : overall > 40 ? "Consider adjusting coaching frequency and style" : "Coaching strategy needs significant adaptation",
    };
  }, []);

  return { selectStrategy, evaluateEffectiveness };
}

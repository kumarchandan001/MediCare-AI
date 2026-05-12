/**
 * ProactiveInsightGenerator — Generates proactive health insights
 * based on longitudinal patterns without waiting for user queries.
 */
import { useCallback } from "react";

export interface ProactiveInsight {
  id: string;
  category: "pattern" | "milestone" | "recommendation" | "reminder" | "celebration";
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
  action: string | null;
  expiresAt: number | null;
  emotionalTone: "encouraging" | "informational" | "celebratory" | "gentle";
}

export function useProactiveInsightGenerator() {
  const generateInsights = useCallback((context: {
    daysSinceLastVisit: number; activeGoals: number; completedGoals: number;
    healthTrend: "improving" | "stable" | "declining"; streakDays: number;
  }): ProactiveInsight[] => {
    const insights: ProactiveInsight[] = [];
    if (context.streakDays > 0 && context.streakDays % 7 === 0) {
      insights.push({ id: `streak-${context.streakDays}`, category: "celebration", title: "Consistency milestone!", message: `You've been engaged for ${context.streakDays} days straight. That dedication matters.`, priority: "medium", actionable: false, action: null, expiresAt: Date.now() + 86400000, emotionalTone: "celebratory" });
    }
    if (context.daysSinceLastVisit > 7) {
      insights.push({ id: "welcome-back", category: "reminder", title: "Welcome back", message: `It's been ${context.daysSinceLastVisit} days — no judgment, just glad you're here. Let's see what's new.`, priority: "low", actionable: true, action: "View health summary", expiresAt: null, emotionalTone: "gentle" });
    }
    if (context.healthTrend === "improving") {
      insights.push({ id: "positive-trend", category: "pattern", title: "Positive trajectory", message: "Your health indicators are trending upward. Whatever you're doing, it seems to be working.", priority: "medium", actionable: false, action: null, expiresAt: Date.now() + 172800000, emotionalTone: "encouraging" });
    }
    if (context.completedGoals > 0 && context.completedGoals >= context.activeGoals) {
      insights.push({ id: "all-goals-complete", category: "milestone", title: "All goals reached", message: "You've completed all your active health goals. Ready to set new ones?", priority: "high", actionable: true, action: "Set new goals", expiresAt: null, emotionalTone: "celebratory" });
    }
    return insights;
  }, []);

  return { generateInsights };
}

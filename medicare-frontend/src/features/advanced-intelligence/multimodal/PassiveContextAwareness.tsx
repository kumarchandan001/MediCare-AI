/**
 * PassiveContextAwareness — Derives health-relevant context from passive
 * signals (time of day, device motion, ambient conditions) without
 * invasive data collection.
 */
import { useCallback } from "react";

export interface PassiveContext {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: "weekday" | "weekend";
  sessionDuration: number;
  interactionIntensity: "high" | "moderate" | "low" | "idle";
  likelyActivity: "active_use" | "passive_monitoring" | "quick_check" | "extended_session";
  healthRelevance: string;
}

export function usePassiveContextAwareness() {
  const deriveContext = useCallback((sessionStartTime: number, interactionCount: number): PassiveContext => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const sessionDuration = Date.now() - sessionStartTime;
    const timeOfDay = hour < 6 ? "night" as const : hour < 12 ? "morning" as const : hour < 18 ? "afternoon" as const : hour < 22 ? "evening" as const : "night" as const;
    const dayOfWeek = (day === 0 || day === 6) ? "weekend" as const : "weekday" as const;
    const interactionsPerMinute = interactionCount / Math.max(1, sessionDuration / 60000);
    const intensity = interactionsPerMinute > 5 ? "high" as const : interactionsPerMinute > 1 ? "moderate" as const : interactionsPerMinute > 0.2 ? "low" as const : "idle" as const;
    let likelyActivity: PassiveContext["likelyActivity"] = "active_use";
    if (sessionDuration < 120000 && interactionCount < 5) likelyActivity = "quick_check";
    else if (sessionDuration > 600000) likelyActivity = "extended_session";
    else if (intensity === "low" || intensity === "idle") likelyActivity = "passive_monitoring";
    const healthRelevance = timeOfDay === "night" && likelyActivity === "extended_session" ? "Late-night extended sessions may indicate difficulty sleeping or health anxiety" : timeOfDay === "morning" && likelyActivity === "quick_check" ? "Morning health check-ins — a positive health-awareness habit" : "Normal usage pattern";
    return { timeOfDay, dayOfWeek, sessionDuration, interactionIntensity: intensity, likelyActivity, healthRelevance };
  }, []);

  return { deriveContext };
}

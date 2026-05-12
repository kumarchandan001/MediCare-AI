/**
 * WellnessGamificationLayer — Adds lightweight, emotionally safe gamification
 * elements like streaks, daily milestones, and positive reinforcement for
 * consistency across health domains.
 */
import { useCallback } from "react";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

export interface WellnessAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "streak" | "milestone" | "balance";
  dateEarned: number;
}

export function useWellnessGamification() {
  const evaluate = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    dailyStreakCount: number
  ): WellnessAchievement[] => {
    const achievements: WellnessAchievement[] = [];
    const now = Date.now();

    // Consistency Streaks
    if (dailyStreakCount > 0 && dailyStreakCount % 7 === 0) {
      achievements.push({
        id: `streak-${dailyStreakCount}-${now}`,
        title: `${dailyStreakCount}-Day Health Streak`,
        description: `You've checked in consistently for ${dailyStreakCount} days. Consistency is the foundation of wellness.`,
        icon: "🔥",
        type: "streak",
        dateEarned: now,
      });
    }

    // High Balance (Multiple domains doing well)
    let highPerformingDomains = 0;
    signals.forEach(signal => {
      if (signal.score >= 80) highPerformingDomains++;
    });

    if (highPerformingDomains >= 4) {
      achievements.push({
        id: `balance-harmony-${now}`,
        title: "Health Harmony",
        description: "You have 4 or more health areas performing at an optimal level simultaneously. Great balance!",
        icon: "🌟",
        type: "balance",
        dateEarned: now,
      });
    }

    // Sleep Milestone
    const sleep = signals.get("sleep");
    if (sleep && sleep.score > 85 && sleep.trend === "improving") {
      achievements.push({
        id: `milestone-sleep-${now}`,
        title: "Master of Rest",
        description: "Your sleep quality is exceptional and improving. Your body thanks you.",
        icon: "🛌",
        type: "milestone",
        dateEarned: now,
      });
    }

    return achievements;
  }, []);

  return { evaluate };
}

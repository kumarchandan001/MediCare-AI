/**
 * HolisticHealthGuidance — Generates guidance that considers ALL health
 * dimensions holistically. Instead of isolated advice per domain, produces
 * integrated guidance considering cross-system effects.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface GuidanceItem {
  id: string;
  title: string;
  guidance: string;
  priority: "high" | "medium" | "low";
  impactedDomains: HealthDomain[];
  effort: "minimal" | "moderate" | "significant";
  timeframe: "immediate" | "this_week" | "ongoing";
  category: "lifestyle" | "recovery" | "prevention" | "emotional" | "monitoring";
}

export interface HolisticGuidancePlan {
  topPriority: GuidanceItem;
  allGuidance: GuidanceItem[];
  dailyFocus: string;
  weeklyGoal: string;
  overallPhilosophy: string;
}

export function useHolisticHealthGuidance() {
  const generate = useCallback((signals: Map<HealthDomain, DomainSignal>): HolisticGuidancePlan => {
    const items: GuidanceItem[] = [];
    const get = (d: HealthDomain) => signals.get(d);

    // ── Integrated Sleep + Stress Guidance ──
    const sleep = get("sleep");
    const emotional = get("emotional");
    if (sleep && emotional && sleep.score < 45 && emotional.score < 45) {
      items.push({
        id: "g-sleep-stress-integrated",
        title: "Break the Stress-Sleep Cycle",
        guidance: "Your sleep and stress are both struggling. Focus on ONE change: a consistent wind-down routine 30 minutes before bed. This addresses both simultaneously — calming stress while improving sleep quality.",
        priority: "high",
        impactedDomains: ["sleep", "emotional", "recovery", "wellness"],
        effort: "moderate",
        timeframe: "this_week",
        category: "lifestyle",
      });
    } else if (sleep && sleep.score < 40) {
      items.push({
        id: "g-sleep-priority",
        title: "Prioritize Sleep Quality",
        guidance: "Sleep is your body's primary recovery mechanism. A consistent bedtime, dark room, and avoiding screens before bed can significantly improve your health across multiple dimensions.",
        priority: "high",
        impactedDomains: ["sleep", "recovery", "activity", "emotional"],
        effort: "moderate",
        timeframe: "this_week",
        category: "lifestyle",
      });
    }

    // ── Activity + Recovery Balance ──
    const activity = get("activity");
    const recovery = get("recovery");
    if (activity && recovery) {
      if (activity.score > 80 && recovery.score < 50) {
        items.push({
          id: "g-activity-recovery-balance",
          title: "Balance Activity with Recovery",
          guidance: "Your activity level is high while recovery is still progressing. Consider reducing intensity temporarily — moderate activity supports recovery better than intense exercise right now.",
          priority: "high",
          impactedDomains: ["activity", "recovery"],
          effort: "minimal",
          timeframe: "immediate",
          category: "recovery",
        });
      } else if (activity.score < 30) {
        items.push({
          id: "g-gentle-movement",
          title: "Start with Gentle Movement",
          guidance: "Even 10-15 minutes of gentle walking can boost energy, improve mood, and support sleep. Start small and build consistency — that matters more than intensity.",
          priority: "medium",
          impactedDomains: ["activity", "wellness", "emotional", "sleep"],
          effort: "minimal",
          timeframe: "immediate",
          category: "lifestyle",
        });
      }
    }

    // ── Medication + Recovery Integration ──
    const medication = get("medication");
    if (medication && recovery && medication.score < 50 && recovery.trend === "declining") {
      items.push({
        id: "g-medication-consistency",
        title: "Medication Consistency for Recovery",
        guidance: "Your recovery progress may be affected by medication gaps. Setting a daily alarm for medication can be the single most impactful action for your recovery trajectory.",
        priority: "high",
        impactedDomains: ["medication", "recovery", "disease_intelligence"],
        effort: "minimal",
        timeframe: "immediate",
        category: "recovery",
      });
    }

    // ── Emotional Wellbeing ──
    if (emotional && emotional.score < 35) {
      items.push({
        id: "g-emotional-support",
        title: "Nurture Your Emotional Wellbeing",
        guidance: "Your stress levels deserve attention. A 5-minute breathing exercise or a short walk can make an immediate difference. Remember, seeking support is a sign of strength, not weakness.",
        priority: "high",
        impactedDomains: ["emotional", "sleep", "wellness"],
        effort: "minimal",
        timeframe: "immediate",
        category: "emotional",
      });
    }

    // ── Preventive Focus ──
    const preventive = get("preventive");
    if (preventive && preventive.score < 40) {
      items.push({
        id: "g-preventive-awareness",
        title: "Preventive Health Check-In",
        guidance: "Taking a few minutes weekly to review your health trends helps catch patterns early. Prevention is always easier than treatment.",
        priority: "medium",
        impactedDomains: ["preventive", "wellness"],
        effort: "minimal",
        timeframe: "this_week",
        category: "prevention",
      });
    }

    // ── General Wellness Maintenance ──
    const wellness = get("wellness");
    if (wellness && wellness.score > 70) {
      items.push({
        id: "g-maintain-momentum",
        title: "Maintain Your Momentum",
        guidance: "Your wellness is in a great place. The key now is consistency — keep doing what's working and stay mindful of gradual changes.",
        priority: "low",
        impactedDomains: ["wellness"],
        effort: "minimal",
        timeframe: "ongoing",
        category: "lifestyle",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const topPriority = items[0] || {
      id: "g-default", title: "Continue Your Journey",
      guidance: "You're doing well. Keep building healthy habits and checking in with your health regularly.",
      priority: "low" as const, impactedDomains: ["wellness" as HealthDomain],
      effort: "minimal" as const, timeframe: "ongoing" as const, category: "lifestyle" as const,
    };

    // Daily focus — one clear action
    const dailyFocus = topPriority.priority === "high"
      ? topPriority.guidance.split(".")[0] + "."
      : "Maintain your current healthy habits today.";

    // Weekly goal
    const weeklyGoal = items.filter(i => i.timeframe === "this_week")[0]?.title || "Review your health trends and adjust one habit.";

    return {
      topPriority,
      allGuidance: items.slice(0, 5),
      dailyFocus,
      weeklyGoal,
      overallPhilosophy: "Small, consistent changes across your health dimensions create the most lasting impact. Focus on one area at a time and let the improvements compound.",
    };
  }, []);

  return { generate };
}

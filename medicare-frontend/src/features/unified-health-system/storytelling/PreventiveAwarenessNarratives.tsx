/**
 * PreventiveAwarenessNarratives — Generates stories focused on preventive
 * health, translating subtle drifts into meaningful, actionable insights.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface PreventiveStory {
  title: string;
  story: string;
  shortSummary: string;
  urgency: "high" | "medium" | "low";
}

export function usePreventiveAwarenessNarratives() {
  const generate = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): PreventiveStory[] => {
    const stories: PreventiveStory[] = [];
    
    const sleep = signals.get("sleep");
    const emotional = signals.get("emotional");
    const activity = signals.get("activity");

    // Burnout trajectory story
    if (sleep && emotional && activity) {
      if (sleep.score < 40 && emotional.score < 40 && activity.score < 40) {
        stories.push({
          title: "The Burnout Warning",
          story: "Your sleep, emotional wellbeing, and activity levels are all simultaneously low. This triad is a classic early warning sign of burnout. Your body is asking for a pause. Ignoring this usually leads to forced rest later. Let's find one small commitment you can drop this week to create some breathing room.",
          shortSummary: "Multiple indicators suggest high burnout risk; reduce commitments.",
          urgency: "high",
        });
      }
    }

    // Sleep Drift Story
    if (sleep && sleep.trend === "declining" && sleep.score < 60) {
      stories.push({
        title: "The Creeping Sleep Debt",
        story: "Over the last few days, your sleep quality has been slowly drifting downward. It's easy to dismiss a single night of bad sleep, but a declining trend creates a compounding sleep debt. Protecting your wind-down time tonight is your highest preventive priority.",
        shortSummary: "Sleep quality is drifting lower; prioritize wind-down time.",
        urgency: "medium",
      });
    }

    // Activity consistency
    if (activity && activity.score > 80 && activity.trend === "improving") {
      stories.push({
        title: "The Protective Power of Movement",
        story: "Your high activity levels are doing more than just keeping you fit; they are building a metabolic and emotional buffer against stress and illness. This consistency is your strongest preventive health asset right now.",
        shortSummary: "Consistent activity is building strong preventive resilience.",
        urgency: "low",
      });
    }

    return stories;
  }, []);

  return { generate };
}

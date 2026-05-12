/**
 * RecoveryJourneyStories — Analyzes recovery signals and memory entries
 * to craft empathetic, context-aware stories about the user's healing process.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";
import type { HealthMemoryEntry } from "../memory/UnifiedHealthMemory";

export interface RecoveryStory {
  title: string;
  story: string;
  shortSummary: string;
  status: "progressing" | "active_struggle" | "plateau" | "completing";
}

export function useRecoveryJourneyStories() {
  const generate = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    recentMemory: HealthMemoryEntry[]
  ): RecoveryStory[] => {
    const stories: RecoveryStory[] = [];
    const recovery = signals.get("recovery");

    if (!recovery) return stories;

    // Check recent memory for specific recovery events
    const recentRecoveryEvents = recentMemory.filter(m => m.domain === "recovery");

    if (recovery.score > 80 && recovery.trend === "improving") {
      stories.push({
        title: "The Home Stretch",
        story: "Your recovery is progressing beautifully. You've navigated the difficult early phases, and your body is now consolidating its healing. This is the time to slowly and carefully reintroduce normal activities, while still fiercely protecting your rest.",
        shortSummary: "Excellent recovery progress; begin careful reintroduction of activities.",
        status: "completing",
      });
    } else if (recovery.score < 40 && recovery.trend === "declining") {
      stories.push({
        title: "Honoring the Struggle",
        story: "Recovery is demanding a lot from you right now. It's completely normal to feel frustrated when healing feels slow or moves backwards. Your body is working incredibly hard behind the scenes. The most productive thing you can do today is grant yourself permission to radically rest.",
        shortSummary: "Recovery is currently challenging; prioritize radical rest.",
        status: "active_struggle",
      });
    } else if (recovery.trend === "stable" && recovery.score < 70) {
      stories.push({
        title: "The Invisible Work of Healing",
        story: "Your recovery has hit a plateau. This often happens when the body is doing deep, invisible repair work. Plateaus aren't failures; they are consolidation phases. Keep maintaining your supportive habits—nutrition, sleep, and medication—and trust that the invisible work is happening.",
        shortSummary: "Recovery has plateaued; maintain supportive habits.",
        status: "plateau",
      });
    } else if (recovery.trend === "improving") {
      stories.push({
        title: "Steady Progress",
        story: "You are making steady, measurable progress in your recovery. The supportive choices you are making are actively aiding your body's natural healing mechanisms. Keep honoring your limits.",
        shortSummary: "Making steady recovery progress.",
        status: "progressing",
      });
    }

    return stories;
  }, []);

  return { generate };
}

/**
 * UnifiedHealthNarrator — The overarching storytelling engine that weaves
 * together recovery journeys, preventive awareness, and general wellness
 * into a single cohesive narrative for the user.
 */
import { useCallback } from "react";
import { useRecoveryJourneyStories, type RecoveryStory } from "./RecoveryJourneyStories";
import { usePreventiveAwarenessNarratives, type PreventiveStory } from "./PreventiveAwarenessNarratives";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";
import type { HealthMemoryEntry } from "../memory/UnifiedHealthMemory";

export interface UnifiedNarrative {
  id: string;
  timestamp: number;
  primaryStory: {
    title: string;
    content: string;
    emotionalTone: "celebratory" | "encouraging" | "cautious" | "reflective";
  };
  supportingStories: {
    domain: HealthDomain;
    content: string;
    type: "recovery" | "preventive" | "wellness";
  }[];
  actionableClosing: string;
}

export function useUnifiedHealthNarrator() {
  const recoveryStories = useRecoveryJourneyStories();
  const preventiveStories = usePreventiveAwarenessNarratives();

  const generateNarrative = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    recentMemory: HealthMemoryEntry[]
  ): UnifiedNarrative => {
    // 1. Generate sub-narratives
    const recStories = recoveryStories.generate(signals, recentMemory);
    const prevStories = preventiveStories.generate(signals);

    // 2. Determine Primary Focus
    // Rules: Recovery takes precedence if active and struggling.
    // Preventive takes precedence if urgent alert exists.
    // Otherwise, celebrate wellness or general progress.

    let primaryStory: UnifiedNarrative["primaryStory"] = {
      title: "Your Health Journey",
      content: "You are building a consistent foundation of health. Every small choice you make is contributing to your long-term wellbeing.",
      emotionalTone: "reflective",
    };

    let actionableClosing = "Keep focusing on small, daily consistencies.";

    const urgentPreventive = prevStories.find((s: PreventiveStory) => s.urgency === "high");
    const activeRecovery = recStories.find((s: RecoveryStory) => s.status === "active_struggle");

    if (urgentPreventive) {
      primaryStory = {
        title: urgentPreventive.title,
        content: urgentPreventive.story,
        emotionalTone: "cautious",
      };
      actionableClosing = "Please prioritize addressing the preventive focus areas highlighted today.";
    } else if (activeRecovery) {
      primaryStory = {
        title: activeRecovery.title,
        content: activeRecovery.story,
        emotionalTone: "encouraging",
      };
      actionableClosing = "Rest and patience are your most important tools right now.";
    } else {
      const positiveRecovery = recStories.find((s: RecoveryStory) => s.status === "progressing");
      if (positiveRecovery) {
        primaryStory = {
          title: positiveRecovery.title,
          content: positiveRecovery.story,
          emotionalTone: "celebratory",
        };
        actionableClosing = "Your body is healing wonderfully. Keep supporting it.";
      }
    }

    // 3. Gather supporting stories
    const supportingStories = [];
    
    // Add up to 1 recovery story if it's not the primary
    const secondaryRecovery = recStories.find((s: RecoveryStory) => s.title !== primaryStory.title);
    if (secondaryRecovery) {
      supportingStories.push({
        domain: "recovery" as HealthDomain,
        content: secondaryRecovery.shortSummary,
        type: "recovery" as const,
      });
    }

    // Add up to 2 preventive stories
    for (const prev of prevStories.filter((s: PreventiveStory) => s.title !== primaryStory.title).slice(0, 2)) {
      supportingStories.push({
        domain: "preventive" as HealthDomain,
        content: prev.shortSummary,
        type: "preventive" as const,
      });
    }

    // Add a wellness note if we have room
    if (supportingStories.length < 3) {
      const wellness = signals.get("wellness");
      if (wellness && wellness.score > 70) {
        supportingStories.push({
          domain: "wellness" as HealthDomain,
          content: "Your overall wellness routines are providing a strong anchor for your health.",
          type: "wellness" as const,
        });
      }
    }

    return {
      id: `narrative-${Date.now()}`,
      timestamp: Date.now(),
      primaryStory,
      supportingStories,
      actionableClosing,
    };
  }, [recoveryStories, preventiveStories]);

  return { generateNarrative };
}

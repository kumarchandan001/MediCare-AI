/**
 * HealthCompanionEngine — Core intelligence for humanized interactions.
 * Generates contextually aware, emotionally intelligent, and longitudinally
 * familiar narratives, guidance, and companion messages.
 * Avoids robotic language and produces medically thoughtful, calm communication.
 */
import { useCallback, useMemo } from "react";
import { useCompanion } from "./CompanionStateProvider";
import { useTemporalHealth } from "@/features/longitudinal-health/TemporalHealthStateProvider";

export function useHealthCompanion() {
  const companion = useCompanion();
  const temporal = useTemporalHealth();

  // ── Humanized health summary (replaces clinical summaries) ──
  const generateCompanionSummary = useCallback((): string => {
    const { activeRecovery, healthTrend, daysMonitored, totalInvestigations, recurringPatterns } = temporal;
    const { familiarityLevel, isNewUser } = companion;

    if (isNewUser) {
      return "I'm your health companion. I'm here to listen, observe, and help you make sense of how you're feeling — without rushing to conclusions. Let's start whenever you're ready.";
    }

    const parts: string[] = [];

    // Recovery-aware opening
    if (activeRecovery) {
      const trend = activeRecovery.trend;
      if (trend === "improving") {
        parts.push(`Your recovery from ${activeRecovery.activeCondition} appears to be progressing well — stability indicators have been encouraging over the past few days.`);
      } else if (trend === "declining") {
        parts.push(`I've noticed some recovery metrics for ${activeRecovery.activeCondition} have been less consistent recently. It may be worth paying attention to how you're feeling today.`);
      } else if (trend === "fragile") {
        parts.push(`Recovery from ${activeRecovery.activeCondition} is ongoing, though some indicators suggest it could benefit from more rest and attention.`);
      } else {
        parts.push(`I'm continuing to track your ${activeRecovery.activeCondition} recovery — so far things appear steady.`);
      }
    }

    // Longitudinal context
    if (totalInvestigations > 1 && !activeRecovery) {
      parts.push(`Across ${totalInvestigations} investigations, your health profile has been building steadily.`);
    }

    // Health trend
    if (healthTrend === "improving") {
      parts.push("Overall, things seem to be trending in a positive direction.");
    } else if (healthTrend === "declining") {
      parts.push("Some patterns suggest a need for closer observation — I'm keeping track so you don't have to worry about forgetting details.");
    } else if (healthTrend === "stable" && daysMonitored > 3) {
      parts.push("Your health indicators have remained generally stable, which is a good sign.");
    }

    // Recurring patterns (mentioned naturally, not alarmingly)
    const meaningful = recurringPatterns.filter(p => p.severity !== "mild");
    if (meaningful.length > 0) {
      const sym = meaningful[0].symptomCluster[0]?.replace(/_/g, " ");
      parts.push(`I've noticed ${sym} appearing a few times — it's something I'll continue watching for context.`);
    }

    // Wearable continuity
    if (temporal.wearableContinuity.driftDetected) {
      parts.push("Your wearable data has shown some gradual changes from baseline. Worth noting, though not necessarily concerning on its own.");
    }

    if (parts.length === 0) {
      return "Everything looks steady today. I'm here if you'd like to check in, investigate something new, or just review your health journey.";
    }

    return parts.join(" ");
  }, [temporal, companion]);

  // ── Contextual greeting ─────────────────
  const generateGreeting = useCallback((): string => {
    return companion.timeAwareGreeting;
  }, [companion]);

  // ── Humanized investigation reflection ──
  const generateInvestigationReflection = useCallback((condition: string, confidence: number): string => {
    const { familiarityLevel } = companion;
    const priorInvestigations = temporal.totalInvestigations;

    const confidenceText = confidence >= 70
      ? "with reasonable clarity"
      : confidence >= 40
        ? "though with some remaining uncertainty"
        : "with quite limited certainty";

    let reflection = `The investigation identified ${condition} as a possibility, ${confidenceText}.`;

    if (priorInvestigations > 1) {
      reflection += " I've added this to your health record so we can track how things evolve.";
    }

    reflection += " Remember, this is a tool for organizing your health observations — not a replacement for professional medical advice.";

    return reflection;
  }, [companion, temporal]);

  // ── Adaptive follow-up messages ────────
  const generateFollowUpMessage = useCallback((): string => {
    const { activeRecovery, lastInvestigation, dailyStatuses } = temporal;
    const recentCheckins = dailyStatuses.slice(-3);

    if (activeRecovery) {
      const dayNum = activeRecovery.currentDay;
      if (dayNum <= 2) {
        return `It's still early in your ${activeRecovery.activeCondition} recovery. How are you feeling today compared to yesterday?`;
      }
      if (activeRecovery.trend === "improving") {
        return `Day ${dayNum} of recovery — things seem to be moving in the right direction. Any new observations today?`;
      }
      return `Day ${dayNum}. I'm here to listen — even small changes in how you feel are worth noting.`;
    }

    if (recentCheckins.length > 0) {
      const lastMood = recentCheckins[recentCheckins.length - 1].mood;
      if (lastMood === "poor") {
        return "Last time you mentioned not feeling great. Has anything changed since then?";
      }
      if (lastMood === "good") {
        return "Glad to hear you were doing well last time. How about today?";
      }
    }

    if (lastInvestigation) {
      return `It's been a little while since your ${lastInvestigation.primaryFinding} investigation. Anything new to report?`;
    }

    return "How are you feeling today? Even small observations help build a clearer picture over time.";
  }, [temporal]);

  // ── Supportive guidance (non-prescriptive) ──
  const generateGuidance = useCallback((context: "recovery" | "monitoring" | "investigation" | "idle"): string[] => {
    const suggestions: string[] = [];

    if (context === "recovery" && temporal.activeRecovery) {
      suggestions.push("Consider keeping a brief note about how you feel each day — patterns become clearer over time.");
      if (temporal.wearableContinuity.sleepScore.trend === "declining") {
        suggestions.push("Sleep quality has been fluctuating. Consistent sleep timing can support recovery.");
      }
      suggestions.push("If symptoms return or worsen, starting a new investigation can help track changes.");
    } else if (context === "monitoring") {
      suggestions.push("Regular check-ins help me understand your baseline better.");
      if (temporal.wearableContinuity.stressLevel.trend === "rising") {
        suggestions.push("Your stress indicators have been creeping up. Small breathing exercises or short walks can help.");
      }
    } else if (context === "idle") {
      suggestions.push("No concerns right now — that's a good thing. I'll continue monitoring quietly.");
      if (temporal.totalInvestigations === 0) {
        suggestions.push("When you're ready, you can start an investigation to explore any health questions.");
      }
    }

    return suggestions.slice(0, 2);
  }, [temporal]);

  // ── Emotionally safe escalation message ──
  const generateEscalationMessage = useCallback((level: string): string => {
    if (level === "emergency") {
      return "Some of the signals suggest this may need urgent medical attention. Please consider contacting a healthcare provider or emergency services. I'm not able to replace professional medical judgment, but I want to make sure you're safe.";
    }
    if (level === "urgent") {
      return "This investigation has raised some concerns that may benefit from timely professional review. I'd suggest speaking with your doctor when you can.";
    }
    return "Everything looks manageable, but as always, trust your own instincts about your body.";
  }, []);

  return {
    generateCompanionSummary,
    generateGreeting,
    generateInvestigationReflection,
    generateFollowUpMessage,
    generateGuidance,
    generateEscalationMessage,
  };
}

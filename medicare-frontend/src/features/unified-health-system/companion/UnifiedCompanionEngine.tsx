/**
 * UnifiedCompanionEngine — Core engine for the unified health companion.
 * Generates contextual, emotionally safe companion messages that consider
 * ALL health domains simultaneously. The companion feels like one coherent
 * voice, not multiple disconnected modules.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain, CrossDomainInsight } from "../UnifiedHealthEngine";

export interface CompanionMessage {
  id: string;
  type: "greeting" | "insight" | "encouragement" | "alert" | "check_in" |
    "milestone" | "reflection" | "guidance";
  content: string;
  tone: "warm" | "supportive" | "cautious" | "celebratory" | "gentle";
  relatedDomains: HealthDomain[];
  priority: number;       // 0-100
  timestamp: number;
  actionable: boolean;
  action?: { label: string; type: string };
}

export interface CompanionContext {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  overallScore: number;
  overallTrend: string;
  activeDomains: HealthDomain[];
  recentInsights: CrossDomainInsight[];
  hasActiveInvestigation: boolean;
  hasActiveRecovery: boolean;
  daysSinceLastInteraction: number;
}

export function useUnifiedCompanion() {
  /**
   * Generate contextual companion messages based on current health state.
   */
  const generateMessages = useCallback((
    context: CompanionContext,
    signals: Map<HealthDomain, DomainSignal>
  ): CompanionMessage[] => {
    const messages: CompanionMessage[] = [];
    const { timeOfDay, overallScore, overallTrend } = context;

    // ── 1. Contextual Greeting ──
    messages.push(createGreeting(context));

    // ── 2. Health State Reflection ──
    if (overallScore > 0) {
      messages.push({
        id: `comp-reflection-${Date.now()}`,
        type: "reflection",
        content: getHealthReflection(overallScore, overallTrend),
        tone: overallScore > 65 ? "warm" : "supportive",
        relatedDomains: [],
        priority: 70,
        timestamp: Date.now(),
        actionable: false,
      });
    }

    // ── 3. Domain-Specific Insights ──
    const sleep = signals.get("sleep");
    if (sleep && sleep.score < 40 && timeOfDay === "evening") {
      messages.push({
        id: `comp-sleep-${Date.now()}`,
        type: "guidance",
        content: "Tonight might be a good time to try a wind-down routine. Even 20 minutes of quiet time before bed can make a real difference. 🌙",
        tone: "gentle",
        relatedDomains: ["sleep"],
        priority: 75,
        timestamp: Date.now(),
        actionable: true,
        action: { label: "Sleep Tips", type: "show_sleep_guidance" },
      });
    }

    const emotional = signals.get("emotional");
    if (emotional && emotional.score < 35) {
      messages.push({
        id: `comp-stress-${Date.now()}`,
        type: "check_in",
        content: "I notice your stress indicators are elevated. Remember, it's okay to take a step back. How are you really feeling today?",
        tone: "supportive",
        relatedDomains: ["emotional"],
        priority: 80,
        timestamp: Date.now(),
        actionable: true,
        action: { label: "Breathing Exercise", type: "start_breathing" },
      });
    }

    // ── 4. Recovery Encouragement ──
    if (context.hasActiveRecovery) {
      const recovery = signals.get("recovery");
      if (recovery && recovery.trend === "improving") {
        messages.push({
          id: `comp-recovery-${Date.now()}`,
          type: "encouragement",
          content: "Your recovery is moving in the right direction. Every day of consistency adds up. Keep going — you're doing great. 💪",
          tone: "celebratory",
          relatedDomains: ["recovery"],
          priority: 65,
          timestamp: Date.now(),
          actionable: false,
        });
      }
    }

    // ── 5. Cross-Domain Insights ──
    for (const insight of context.recentInsights.slice(0, 2)) {
      if (insight.actionSuggestion) {
        messages.push({
          id: `comp-insight-${insight.id}`,
          type: "insight",
          content: insight.insight,
          tone: insight.impact === "positive" ? "warm" : "gentle",
          relatedDomains: insight.sourceDomains,
          priority: 60,
          timestamp: Date.now(),
          actionable: true,
          action: { label: "Learn More", type: "expand_insight" },
        });
      }
    }

    // ── 6. Milestone Detection ──
    if (overallScore > 75 && overallTrend === "improving") {
      messages.push({
        id: `comp-milestone-${Date.now()}`,
        type: "milestone",
        content: "🎉 Your health score is above 75 and trending upward! That's a real achievement. Your consistent effort is paying off.",
        tone: "celebratory",
        relatedDomains: [],
        priority: 90,
        timestamp: Date.now(),
        actionable: false,
      });
    }

    // ── 7. Return-after-absence ──
    if (context.daysSinceLastInteraction > 3) {
      messages.push({
        id: `comp-welcome-back-${Date.now()}`,
        type: "greeting",
        content: `Welcome back! It's been a few days. No judgment — let's catch up on how you're doing. Your health data has been quietly accumulating. 📊`,
        tone: "warm",
        relatedDomains: [],
        priority: 85,
        timestamp: Date.now(),
        actionable: true,
        action: { label: "Catch Up", type: "show_summary" },
      });
    }

    return messages
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Cap at 5 messages to avoid overwhelm
  }, []);

  return { generateMessages };
}

function createGreeting(context: CompanionContext): CompanionMessage {
  const greetings: Record<string, string> = {
    morning: "Good morning! ☀️ Let's see how your health is looking today.",
    afternoon: "Good afternoon! Here's a quick look at your health picture.",
    evening: "Good evening! Time for a gentle health check-in. 🌅",
    night: "Late night? Remember, rest is an investment in tomorrow's health. 🌙",
  };

  return {
    id: `comp-greeting-${Date.now()}`,
    type: "greeting",
    content: greetings[context.timeOfDay],
    tone: "warm",
    relatedDomains: [],
    priority: 50,
    timestamp: Date.now(),
    actionable: false,
  };
}

function getHealthReflection(score: number, trend: string): string {
  if (score >= 75 && trend === "improving") {
    return "Your health picture is looking strong. Multiple systems are working well together — that's the power of consistency.";
  }
  if (score >= 60) {
    return "You're in a good place overall. There's always room to fine-tune, but the fundamentals are solid.";
  }
  if (score >= 40) {
    return "Some areas of your health could use attention, but there's plenty to build on. Small changes can create big momentum.";
  }
  return "I can see you're going through a challenging time health-wise. Remember, every step toward better habits counts, no matter how small.";
}

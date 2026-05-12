/**
 * CrossDomainConversationManager — Manages multi-turn companion conversations
 * that span health domains. Maintains conversational context so the companion
 * remembers what was discussed and builds on prior exchanges.
 */
import { useCallback, useRef, useState } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";

export interface ConversationTurn {
  id: string;
  speaker: "companion" | "user";
  message: string;
  relatedDomains: HealthDomain[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  turns: ConversationTurn[];
  currentTopic: HealthDomain | "general";
  topicHistory: HealthDomain[];
  emotionalTone: "neutral" | "concerned" | "positive" | "supportive";
  sessionStarted: number;
}

export interface ConversationResponse {
  message: string;
  suggestedFollowUps: string[];
  shouldTransition: boolean;
  transitionTopic?: HealthDomain;
}

const SESSION_KEY = "medicare_companion_conversation";

export function useCrossDomainConversation() {
  const [context, setContext] = useState<ConversationContext>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if session is less than 2 hours old
        if (Date.now() - parsed.sessionStarted < 7_200_000) return parsed;
      }
    } catch { /* ignore */ }
    return {
      turns: [],
      currentTopic: "general" as const,
      topicHistory: [],
      emotionalTone: "neutral" as const,
      sessionStarted: Date.now(),
    };
  });

  const turnCountRef = useRef(context.turns.length);

  const addCompanionMessage = useCallback((message: string, domains: HealthDomain[] = []) => {
    setContext(prev => {
      const turn: ConversationTurn = {
        id: `turn-${Date.now()}-${turnCountRef.current++}`,
        speaker: "companion",
        message,
        relatedDomains: domains,
        timestamp: Date.now(),
      };
      const updated = {
        ...prev,
        turns: [...prev.turns.slice(-20), turn], // Keep last 20 turns
        currentTopic: domains[0] || prev.currentTopic,
        topicHistory: domains[0] && domains[0] !== prev.currentTopic
          ? [...prev.topicHistory.slice(-5), domains[0]]
          : prev.topicHistory,
      };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const addUserMessage = useCallback((message: string) => {
    setContext(prev => {
      const detectedDomains = detectDomains(message);
      const emotionalTone = detectEmotionalTone(message, prev.emotionalTone);
      const turn: ConversationTurn = {
        id: `turn-${Date.now()}-${turnCountRef.current++}`,
        speaker: "user",
        message,
        relatedDomains: detectedDomains,
        timestamp: Date.now(),
      };
      const updated = {
        ...prev,
        turns: [...prev.turns.slice(-20), turn],
        currentTopic: detectedDomains[0] || prev.currentTopic,
        emotionalTone,
      };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const generateResponse = useCallback((userMessage: string): ConversationResponse => {
    const domains = detectDomains(userMessage);
    const tone = detectEmotionalTone(userMessage, context.emotionalTone);

    // Context-aware response generation
    let message: string;
    const suggestedFollowUps: string[] = [];

    if (tone === "concerned") {
      message = "I hear you, and I want you to know it's okay to feel this way. Let's look at what might be contributing and what small steps could help.";
      suggestedFollowUps.push("What's been most challenging?", "Show me my recent trends", "Any suggestions?");
    } else if (domains.includes("sleep")) {
      message = "Sleep is such a foundational piece of health. Let me check your recent sleep patterns and see what stands out.";
      suggestedFollowUps.push("How can I improve my sleep?", "Show sleep trends", "Does sleep affect my recovery?");
    } else if (domains.includes("recovery")) {
      message = "Recovery is personal — everyone's body heals at its own pace. Let's look at how your recovery is progressing and what's supporting it.";
      suggestedFollowUps.push("Am I recovering on track?", "What helps recovery?", "Show recovery timeline");
    } else if (domains.includes("emotional")) {
      message = "Your emotional wellbeing matters just as much as physical health. Taking time to check in with yourself is a strength.";
      suggestedFollowUps.push("Stress management tips", "How does stress affect me?", "I need a break");
    } else if (domains.includes("medication")) {
      message = "Medication consistency is one of the most impactful things you can do for your health. Let's review your adherence patterns.";
      suggestedFollowUps.push("Set a reminder", "How am I doing with meds?", "Does it affect recovery?");
    } else {
      message = "I'm here to help you understand your health picture. What would you like to explore?";
      suggestedFollowUps.push("Overall health summary", "What should I focus on?", "Show my timeline");
    }

    // Determine if topic transition is needed
    const shouldTransition = domains.length > 0 && domains[0] !== context.currentTopic;

    return {
      message,
      suggestedFollowUps,
      shouldTransition,
      transitionTopic: shouldTransition ? domains[0] : undefined,
    };
  }, [context]);

  const clearConversation = useCallback(() => {
    const fresh: ConversationContext = {
      turns: [], currentTopic: "general", topicHistory: [],
      emotionalTone: "neutral", sessionStarted: Date.now(),
    };
    setContext(fresh);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  return {
    context,
    addCompanionMessage,
    addUserMessage,
    generateResponse,
    clearConversation,
  };
}

function detectDomains(message: string): HealthDomain[] {
  const lower = message.toLowerCase();
  const domains: HealthDomain[] = [];

  const keywords: Record<HealthDomain, string[]> = {
    sleep: ["sleep", "insomnia", "tired", "rest", "bedtime", "nap", "fatigue"],
    activity: ["exercise", "activity", "walk", "run", "workout", "steps", "movement"],
    emotional: ["stress", "anxiety", "mood", "emotional", "worried", "overwhelmed", "nervous"],
    recovery: ["recovery", "healing", "getting better", "relapse", "setback"],
    medication: ["medication", "medicine", "pill", "dose", "prescription", "drug"],
    nutrition: ["diet", "food", "eating", "nutrition", "meal", "appetite"],
    wearable: ["heart rate", "wearable", "watch", "fitbit", "steps"],
    wellness: ["wellness", "wellbeing", "health", "overall"],
    disease_intelligence: ["symptoms", "diagnosis", "condition", "investigation"],
    preventive: ["prevention", "preventive", "screening", "checkup"],
    coaching: ["advice", "guidance", "coach", "help", "suggest"],
  };

  for (const [domain, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) {
      domains.push(domain as HealthDomain);
    }
  }

  return domains;
}

function detectEmotionalTone(
  message: string, current: ConversationContext["emotionalTone"]
): ConversationContext["emotionalTone"] {
  const lower = message.toLowerCase();

  const concernedWords = ["worried", "scared", "anxious", "worse", "bad", "terrible", "help", "struggling", "afraid"];
  const positiveWords = ["better", "good", "great", "improving", "happy", "thanks", "amazing"];

  if (concernedWords.some(w => lower.includes(w))) return "concerned";
  if (positiveWords.some(w => lower.includes(w))) return "positive";
  return current === "concerned" ? "supportive" : "neutral";
}

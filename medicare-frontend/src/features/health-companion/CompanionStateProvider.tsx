/**
 * CompanionStateProvider — Global state for the AI Health Companion layer.
 * Manages companion personality, emotional context, cognitive load adaptation,
 * conversational continuity, and relationship familiarity.
 * Persists to localStorage for cross-session companion memory.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

// ── Companion personality tone ───────────
export type CompanionTone = "warm" | "calm" | "attentive" | "supportive" | "reassuring";

// ── Emotional context state ──────────────
export interface EmotionalContext {
  userStressLevel: "low" | "moderate" | "elevated" | "high";
  anxietyIndicators: number;       // 0-100
  cognitiveLoad: "light" | "moderate" | "heavy";
  investigationFatigue: boolean;
  escalationSensitivity: "normal" | "heightened" | "reduced";
  lastEmotionalCheck: number;
}

// ── Companion relationship metrics ───────
export interface CompanionRelationship {
  sessionsShared: number;
  investigationsGuided: number;
  checkinsCompleted: number;
  recoveriesSupported: number;
  daysSinceFirstInteraction: number;
  lastGreeting: string;
  preferredTimeOfDay: "morning" | "afternoon" | "evening" | "unknown";
  communicationPreference: "detailed" | "concise" | "narrative";
}

// ── Companion message entry ──────────────
export interface CompanionMessage {
  id: string;
  timestamp: number;
  text: string;
  type: "greeting" | "insight" | "encouragement" | "guidance" | "reflection" | "followup";
  tone: CompanionTone;
}

// ── Cognitive load config ────────────────
export interface CognitiveLoadConfig {
  informationDensity: "minimal" | "moderate" | "detailed";
  narrativeLength: "brief" | "standard" | "expanded";
  showGraphs: boolean;
  progressiveDepth: number; // 0-3 (0 = headline only, 3 = full detail)
  animationIntensity: "subtle" | "standard" | "reduced";
}

// ── Context value ────────────────────────
interface CompanionContextValue {
  // Personality
  currentTone: CompanionTone;
  setTone: (t: CompanionTone) => void;

  // Emotional context
  emotionalContext: EmotionalContext;
  updateEmotionalContext: (update: Partial<EmotionalContext>) => void;
  assessEmotionalState: (phase: string, escalation: string) => void;

  // Relationship
  relationship: CompanionRelationship;
  incrementInteraction: (type: "session" | "investigation" | "checkin" | "recovery") => void;

  // Companion messages
  companionMessages: CompanionMessage[];
  addCompanionMessage: (msg: Omit<CompanionMessage, "id" | "timestamp">) => void;
  lastCompanionMessage: CompanionMessage | null;

  // Cognitive load
  cognitiveConfig: CognitiveLoadConfig;
  setCognitiveConfig: (update: Partial<CognitiveLoadConfig>) => void;
  adaptToStress: () => void;

  // Computed
  companionName: string;
  isNewUser: boolean;
  familiarityLevel: "new" | "acquainted" | "familiar" | "trusted";
  timeAwareGreeting: string;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);
const COMPANION_STORAGE_KEY = "medicare_companion_state";

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used inside CompanionStateProvider");
  return ctx;
}

function loadState() {
  try {
    const raw = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state: Record<string, any>) {
  try {
    localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function CompanionStateProvider({ children }: { children: React.ReactNode }) {
  const persisted = loadState();

  const [currentTone, setTone] = useState<CompanionTone>(persisted?.currentTone || "warm");

  const [emotionalContext, setEmotionalContext] = useState<EmotionalContext>(persisted?.emotionalContext || {
    userStressLevel: "low",
    anxietyIndicators: 0,
    cognitiveLoad: "light",
    investigationFatigue: false,
    escalationSensitivity: "normal",
    lastEmotionalCheck: Date.now(),
  });

  const [relationship, setRelationship] = useState<CompanionRelationship>(persisted?.relationship || {
    sessionsShared: 0,
    investigationsGuided: 0,
    checkinsCompleted: 0,
    recoveriesSupported: 0,
    daysSinceFirstInteraction: 0,
    lastGreeting: "",
    preferredTimeOfDay: "unknown",
    communicationPreference: "narrative",
  });

  const [companionMessages, setCompanionMessages] = useState<CompanionMessage[]>(
    persisted?.companionMessages?.slice(-15) || []
  );

  const [cognitiveConfig, setCognitiveConfigState] = useState<CognitiveLoadConfig>(persisted?.cognitiveConfig || {
    informationDensity: "moderate",
    narrativeLength: "standard",
    showGraphs: true,
    progressiveDepth: 1,
    animationIntensity: "standard",
  });

  // Persist
  useEffect(() => {
    saveState({
      currentTone,
      emotionalContext,
      relationship,
      companionMessages: companionMessages.slice(-15),
      cognitiveConfig,
    });
  }, [currentTone, emotionalContext, relationship, companionMessages, cognitiveConfig]);

  // ── Emotional context ──────────────────
  const updateEmotionalContext = useCallback((update: Partial<EmotionalContext>) => {
    setEmotionalContext(prev => ({ ...prev, ...update, lastEmotionalCheck: Date.now() }));
  }, []);

  const assessEmotionalState = useCallback((phase: string, escalation: string) => {
    let stress: EmotionalContext["userStressLevel"] = "low";
    let tone: CompanionTone = "warm";

    if (escalation === "emergency" || escalation === "urgent") {
      stress = "high";
      tone = "reassuring";
    } else if (phase === "analyzing") {
      stress = "moderate";
      tone = "calm";
    } else if (phase === "investigation") {
      stress = "moderate";
      tone = "supportive";
    }

    setEmotionalContext(prev => ({
      ...prev,
      userStressLevel: stress,
      lastEmotionalCheck: Date.now(),
    }));
    setTone(tone);
  }, []);

  // ── Relationship tracking ─────────────
  const incrementInteraction = useCallback((type: "session" | "investigation" | "checkin" | "recovery") => {
    setRelationship(prev => {
      const updated = { ...prev };
      if (type === "session") updated.sessionsShared += 1;
      else if (type === "investigation") updated.investigationsGuided += 1;
      else if (type === "checkin") updated.checkinsCompleted += 1;
      else if (type === "recovery") updated.recoveriesSupported += 1;

      // Detect preferred time of day
      const hour = new Date().getHours();
      if (hour < 12) updated.preferredTimeOfDay = "morning";
      else if (hour < 17) updated.preferredTimeOfDay = "afternoon";
      else updated.preferredTimeOfDay = "evening";

      return updated;
    });
  }, []);

  // ── Companion messages ─────────────────
  const addCompanionMessage = useCallback((msg: Omit<CompanionMessage, "id" | "timestamp">) => {
    setCompanionMessages(prev => [...prev, {
      ...msg,
      id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    }]);
  }, []);

  const lastCompanionMessage = companionMessages.length > 0
    ? companionMessages[companionMessages.length - 1]
    : null;

  // ── Cognitive load management ──────────
  const setCognitiveConfig = useCallback((update: Partial<CognitiveLoadConfig>) => {
    setCognitiveConfigState(prev => ({ ...prev, ...update }));
  }, []);

  const adaptToStress = useCallback(() => {
    if (emotionalContext.userStressLevel === "high" || emotionalContext.userStressLevel === "elevated") {
      setCognitiveConfigState({
        informationDensity: "minimal",
        narrativeLength: "brief",
        showGraphs: false,
        progressiveDepth: 0,
        animationIntensity: "reduced",
      });
    } else if (emotionalContext.userStressLevel === "moderate") {
      setCognitiveConfigState(prev => ({
        ...prev,
        informationDensity: "moderate",
        narrativeLength: "standard",
        progressiveDepth: 1,
      }));
    }
  }, [emotionalContext.userStressLevel]);

  // ── Computed values ────────────────────
  const companionName = "MediCare Companion";

  const isNewUser = relationship.sessionsShared < 2 && relationship.investigationsGuided === 0;

  const familiarityLevel = useMemo(() => {
    const total = relationship.sessionsShared + relationship.investigationsGuided + relationship.checkinsCompleted;
    if (total <= 1) return "new" as const;
    if (total <= 5) return "acquainted" as const;
    if (total <= 15) return "familiar" as const;
    return "trusted" as const;
  }, [relationship]);

  const timeAwareGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    if (isNewUser) return `${prefix}. Welcome to your personal health companion.`;

    const familiarity: Record<string, string> = {
      acquainted: `${prefix}. I'm here to continue supporting your health.`,
      familiar: `${prefix}. Your health monitoring is active and tracking well.`,
      trusted: `${prefix}. Your health companion is here, as always.`,
    };
    return familiarity[familiarityLevel] || `${prefix}.`;
  }, [isNewUser, familiarityLevel]);

  const value = useMemo<CompanionContextValue>(() => ({
    currentTone, setTone,
    emotionalContext, updateEmotionalContext, assessEmotionalState,
    relationship, incrementInteraction,
    companionMessages, addCompanionMessage, lastCompanionMessage,
    cognitiveConfig, setCognitiveConfig, adaptToStress,
    companionName, isNewUser, familiarityLevel, timeAwareGreeting,
  }), [
    currentTone, emotionalContext, relationship,
    companionMessages, lastCompanionMessage, cognitiveConfig,
    companionName, isNewUser, familiarityLevel, timeAwareGreeting,
    updateEmotionalContext, assessEmotionalState,
    incrementInteraction, addCompanionMessage,
    setCognitiveConfig, adaptToStress,
  ]);

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

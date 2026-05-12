/**
 * InvestigationStateProvider — Unified Clinical Investigation State
 * Orchestrates ALL clinical state: interview, prediction, governance,
 * longitudinal history, monitoring, and focus priority into one context.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { PredictionResult } from "@/features/prediction/types/prediction.types";
import type { ComprehensiveRealismReport } from "@/features/clinical-realism/RealismValidationOrchestrator";

// ── Investigation phases ─────────────────
export type InvestigationPhase = "intake" | "analyzing" | "investigation";

// ── Focus priority — Clinical Focus Mode ─
export type FocusPriority = "conversation" | "reasoning" | "evidence" | "monitoring" | "storytelling";

// ── Interview conversation entry ─────────
export interface ConversationEntry {
  id: string;
  type: "question" | "answer" | "stage_change" | "escalation" | "insight";
  text: string;
  timestamp: number;
  stage?: string;
}

// ── Interview question shape ─────────────
export interface InterviewQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

// ── Reasoning metadata from interview ────
export interface ReasoningMetadata {
  active_domain: string;
  severity_risk_state: string;
  evidence_sufficiency: string;
  reasoning_confidence: number;
  contradiction_signals: string[];
  hypotheses_preview: { condition: string; confidence: number }[];
}

// ── Interview state shape ────────────────
export interface InterviewState {
  current_stage: string;
  investigation_completeness: number;
  remaining_ambiguity: number;
  active_symptoms: string[];
  severity_indicators: string[];
  reasoning_metadata: ReasoningMetadata;
}

// ── Governance result shape ──────────────
export interface GovernanceResult {
  is_safe: boolean;
  governed_hypotheses: { condition: string; confidence: number; raw_confidence: number }[];
  confidence_adjustments: { condition: string; raw: number; governed: number; reasons: string[] }[];
  escalation: {
    escalation_level: string;
    is_emergency: boolean;
    reasons: string[];
    action: string;
    severity_score: number;
    summary: string;
  };
  uncertainty: { is_safe: boolean; violations: string[]; warnings: string[]; summary: string };
  safety: { is_safe: boolean; violations: string[]; safe_text: string; disclaimer: string; summary: string };
  ambiguity: {
    ambiguity_score: number;
    ambiguity_level: string;
    should_preserve: boolean;
    preservation_actions: { type: string; action: string }[];
    summary: string;
  };
  human_review: {
    should_recommend_review: boolean;
    triggers: { type: string; reason: string }[];
    urgency: string;
    recommendation: string;
    summary: string;
  };
  ethics: { is_ethical: boolean; violations: string[]; summary: string };
  summary: string;
}

// ── Emotional safety shape ───────────────
export interface EmotionalSafetyResult {
  calm_narrative: string;
  anxiety_score: number;
  cognitive_load: number;
  modifications: string[];
  is_safe: boolean;
}

// ── Longitudinal history shape ───────────
export interface LongitudinalEntry {
  id: string;
  date: string;
  primaryFinding: string;
  confidence: number;
  symptoms: string[];
  outcome?: string;
  escalationLevel?: string;
}

// ── Monitoring pulse (passive awareness) ─
export interface MonitoringPulse {
  isActive: boolean;
  lastCheckTimestamp: number;
  trend: "stable" | "improving" | "worsening" | "unknown";
  recurringSymptoms: string[];
  driftScore: number;
}

// ── Storytelling narrative entry ─────────
export interface StorytellingEntry {
  id: string;
  timestamp: number;
  narrative: string;
  type: "progression" | "recovery" | "deterioration" | "confidence_shift" | "continuity";
}

// ── Context value ────────────────────────
interface InvestigationContextValue {
  // Phase
  phase: InvestigationPhase;
  setPhase: (p: InvestigationPhase) => void;

  // Clinical Focus Mode
  focusPriority: FocusPriority;
  setFocusPriority: (f: FocusPriority) => void;

  // Interview state
  sessionId: string | null;
  setSessionId: (s: string | null) => void;
  currentQuestion: InterviewQuestion | null;
  setCurrentQuestion: (q: InterviewQuestion | null) => void;
  interviewState: InterviewState | null;
  setInterviewState: (s: InterviewState | null) => void;
  conversation: ConversationEntry[];
  addConversationEntry: (entry: Omit<ConversationEntry, "id" | "timestamp">) => void;
  clearConversation: () => void;

  // Prediction + governance
  predictionResult: PredictionResult | null;
  setPredictionResult: (r: PredictionResult | null) => void;
  governance: GovernanceResult | null;
  setGovernance: (g: GovernanceResult | null) => void;
  emotionalSafety: EmotionalSafetyResult | null;
  setEmotionalSafety: (e: EmotionalSafetyResult | null) => void;
  realismValidation: ComprehensiveRealismReport | null;
  setRealismValidation: (r: ComprehensiveRealismReport | null) => void;

  // Analyzing animation
  analyzingStage: string;
  setAnalyzingStage: (s: string) => void;
  analyzingProgress: number;
  setAnalyzingProgress: (p: number) => void;

  // Longitudinal continuity
  longitudinalHistory: LongitudinalEntry[];
  addLongitudinalEntry: (entry: LongitudinalEntry) => void;

  // Continuous monitoring
  monitoringPulse: MonitoringPulse;
  updateMonitoringPulse: (update: Partial<MonitoringPulse>) => void;

  // Clinical storytelling
  storyEntries: StorytellingEntry[];
  addStoryEntry: (entry: Omit<StorytellingEntry, "id" | "timestamp">) => void;

  // Manual symptom refinement
  manualSymptomsPanelOpen: boolean;
  setManualSymptomsPanelOpen: (open: boolean) => void;
  manuallyAddedSymptoms: string[];
  addManualSymptom: (s: string) => void;
  removeManualSymptom: (s: string) => void;

  // Computed helpers
  governedConfidence: number;
  evidenceStrength: string;
  isEmergency: boolean;
  needsHumanReview: boolean;
  ambiguityLevel: string;
  escalationLevel: string;
  investigationCompleteness: number;
  activeSymptomCount: number;

  resetInvestigation: () => void;
}

const InvestigationContext = createContext<InvestigationContextValue | null>(null);

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (!ctx) throw new Error("useInvestigation must be used inside InvestigationStateProvider");
  return ctx;
}

export default function InvestigationStateProvider({ children }: { children: React.ReactNode }) {
  // ── Phase ──────────────────────────────
  const [phase, setPhase] = useState<InvestigationPhase>("intake");

  // ── Clinical Focus Mode ────────────────
  const [focusPriority, setFocusPriority] = useState<FocusPriority>("conversation");

  // ── Interview ──────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState | null>(null);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  // ── Prediction + governance ────────────
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [governance, setGovernance] = useState<GovernanceResult | null>(null);
  const [emotionalSafety, setEmotionalSafety] = useState<EmotionalSafetyResult | null>(null);
  const [realismValidation, setRealismValidation] = useState<ComprehensiveRealismReport | null>(null);

  // ── Analyzing animation ────────────────
  const [analyzingStage, setAnalyzingStage] = useState("");
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  // ── Longitudinal continuity ────────────
  const [longitudinalHistory, setLongitudinalHistory] = useState<LongitudinalEntry[]>([]);

  // ── Continuous monitoring ──────────────
  const [monitoringPulse, setMonitoringPulse] = useState<MonitoringPulse>({
    isActive: true,
    lastCheckTimestamp: Date.now(),
    trend: "unknown",
    recurringSymptoms: [],
    driftScore: 0,
  });

  // ── Storytelling ───────────────────────
  const [storyEntries, setStoryEntries] = useState<StorytellingEntry[]>([]);

  // ── Manual symptom refinement ──────────
  const [manualSymptomsPanelOpen, setManualSymptomsPanelOpen] = useState(false);
  const [manuallyAddedSymptoms, setManuallyAddedSymptoms] = useState<string[]>([]);

  // ── Conversation helpers ───────────────
  const addConversationEntry = useCallback((entry: Omit<ConversationEntry, "id" | "timestamp">) => {
    setConversation(prev => [...prev, {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    }]);
  }, []);

  const clearConversation = useCallback(() => setConversation([]), []);

  // ── Longitudinal helpers ───────────────
  const addLongitudinalEntry = useCallback((entry: LongitudinalEntry) => {
    setLongitudinalHistory(prev => [...prev, entry]);
  }, []);

  // ── Monitoring helpers ─────────────────
  const updateMonitoringPulse = useCallback((update: Partial<MonitoringPulse>) => {
    setMonitoringPulse(prev => ({ ...prev, ...update }));
  }, []);

  // ── Storytelling helpers ───────────────
  const addStoryEntry = useCallback((entry: Omit<StorytellingEntry, "id" | "timestamp">) => {
    setStoryEntries(prev => [...prev, {
      ...entry,
      id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    }]);
  }, []);

  // ── Manual symptom helpers ─────────────
  const addManualSymptom = useCallback((s: string) => {
    setManuallyAddedSymptoms(prev => prev.includes(s) ? prev : [...prev, s]);
  }, []);

  const removeManualSymptom = useCallback((s: string) => {
    setManuallyAddedSymptoms(prev => prev.filter(x => x !== s));
  }, []);

  // ── Reset ──────────────────────────────
  const resetInvestigation = useCallback(() => {
    setPhase("intake");
    setFocusPriority("conversation");
    setSessionId(null);
    setCurrentQuestion(null);
    setInterviewState(null);
    setConversation([]);
    setPredictionResult(null);
    setGovernance(null);
    setEmotionalSafety(null);
    setAnalyzingStage("");
    setAnalyzingProgress(0);
    setStoryEntries([]);
    setManuallyAddedSymptoms([]);
    setManualSymptomsPanelOpen(false);
  }, []);

  // ── Auto-focus priority based on phase ─
  useEffect(() => {
    if (phase === "intake") setFocusPriority("conversation");
    else if (phase === "analyzing") setFocusPriority("reasoning");
    else if (phase === "investigation") setFocusPriority("storytelling");
  }, [phase]);

  // ── Passive monitoring tick ────────────
  useEffect(() => {
    const interval = setInterval(() => {
      updateMonitoringPulse({ lastCheckTimestamp: Date.now(), isActive: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [updateMonitoringPulse]);

  // ── Generate storytelling on investigation entry ─
  useEffect(() => {
    if (phase === "investigation" && predictionResult && storyEntries.length === 0) {
      const disease = predictionResult.predicted_disease;
      const priorEntry = longitudinalHistory.length > 0
        ? longitudinalHistory[longitudinalHistory.length - 1]
        : null;

      if (priorEntry) {
        addStoryEntry({
          type: "continuity",
          narrative: `Continuing from your previous investigation on ${priorEntry.date} regarding ${priorEntry.primaryFinding}. The current analysis builds upon prior clinical observations.`,
        });
      }

      addStoryEntry({
        type: "progression",
        narrative: `Clinical investigation identified ${disease} as the primary finding based on current symptom patterns and evidence analysis.`,
      });
    }
  }, [phase, predictionResult, storyEntries.length, longitudinalHistory, addStoryEntry]);

  // ── Computed values ────────────────────
  const governedConfidence = useMemo(() => {
    if (governance?.governed_hypotheses?.[0]) return governance.governed_hypotheses[0].confidence * 100;
    return predictionResult?.confidence ?? 0;
  }, [governance, predictionResult]);

  const evidenceStrength = predictionResult?.xai?.evidence_strength ?? "Unknown";
  const isEmergency = governance?.escalation?.is_emergency ?? false;
  const needsHumanReview = governance?.human_review?.should_recommend_review ?? false;
  const ambiguityLevel = governance?.ambiguity?.ambiguity_level ?? "unknown";
  const escalationLevel = governance?.escalation?.escalation_level ?? "routine";
  const investigationCompleteness = interviewState?.investigation_completeness ?? 0;
  const activeSymptomCount = interviewState?.active_symptoms?.length ?? manuallyAddedSymptoms.length;

  const value = useMemo<InvestigationContextValue>(() => ({
    phase, setPhase,
    focusPriority, setFocusPriority,
    sessionId, setSessionId,
    currentQuestion, setCurrentQuestion,
    interviewState, setInterviewState,
    conversation, addConversationEntry, clearConversation,
    predictionResult, setPredictionResult,
    governance, setGovernance,
    emotionalSafety, setEmotionalSafety,
    realismValidation, setRealismValidation,
    analyzingStage, setAnalyzingStage,
    analyzingProgress, setAnalyzingProgress,
    longitudinalHistory, addLongitudinalEntry,
    monitoringPulse, updateMonitoringPulse,
    storyEntries, addStoryEntry,
    manualSymptomsPanelOpen, setManualSymptomsPanelOpen,
    manuallyAddedSymptoms, addManualSymptom, removeManualSymptom,
    governedConfidence, evidenceStrength, isEmergency,
    needsHumanReview, ambiguityLevel, escalationLevel,
    investigationCompleteness, activeSymptomCount,
    resetInvestigation,
  }), [
    phase, focusPriority,
    sessionId, currentQuestion, interviewState, conversation,
    predictionResult, governance, emotionalSafety,
    analyzingStage, analyzingProgress,
    longitudinalHistory, monitoringPulse,
    storyEntries,
    manualSymptomsPanelOpen, manuallyAddedSymptoms,
    governedConfidence, evidenceStrength, isEmergency,
    needsHumanReview, ambiguityLevel, escalationLevel,
    investigationCompleteness, activeSymptomCount,
    resetInvestigation, addConversationEntry, clearConversation,
    addLongitudinalEntry, updateMonitoringPulse, addStoryEntry,
    addManualSymptom, removeManualSymptom,
  ]);

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
}

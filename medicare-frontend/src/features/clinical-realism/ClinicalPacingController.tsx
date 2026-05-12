/**
 * ClinicalPacingController — Adaptive pacing system that controls
 * how rapidly the AI asks questions, escalates urgency, and intensifies
 * follow-ups. Adapts based on user cognitive load, uncertainty, and severity.
 */
import { useCallback, useRef } from "react";

export type PacingMode = "calm" | "attentive" | "focused" | "urgent";

export interface PacingState {
  mode: PacingMode;
  questionCooldownMs: number;       // Minimum ms between questions
  maxQuestionsPerBurst: number;     // Max questions before requiring a pause
  followUpIntensity: number;        // 0-100
  shouldInsertReflectivePause: boolean;
  narrativeComplexity: "simple" | "standard" | "detailed";
  explanation: string;
}

export interface PacingFactors {
  escalationLevel: string;
  uncertaintyLevel: string;
  userResponseSpeed: number;        // avg ms per user response
  consecutiveQuestions: number;
  cognitiveLoadEstimate: number;    // 0-100
  isFirstInvestigation: boolean;
}

export function useClinicalPacing() {
  const lastQuestionTimeRef = useRef(0);
  const burstCountRef = useRef(0);

  const evaluatePacing = useCallback((factors: PacingFactors): PacingState => {
    const {
      escalationLevel,
      uncertaintyLevel,
      userResponseSpeed,
      consecutiveQuestions,
      cognitiveLoadEstimate,
      isFirstInvestigation,
    } = factors;

    // Determine base pacing mode
    let mode: PacingMode = "calm";
    if (escalationLevel === "emergency" || escalationLevel === "urgent") {
      mode = "urgent";
    } else if (escalationLevel === "elevated") {
      mode = "focused";
    } else if (uncertaintyLevel === "high" || uncertaintyLevel === "very_high") {
      mode = "attentive";
    }

    // Question cooldown based on mode and user speed
    const baseCooldowns: Record<PacingMode, number> = {
      calm: 3000,
      attentive: 2000,
      focused: 1500,
      urgent: 1000,
    };
    let cooldown = baseCooldowns[mode];

    // If user is slow to respond, increase cooldown
    if (userResponseSpeed > 10000) {
      cooldown = Math.min(cooldown * 1.5, 8000);
    }

    // First investigation gets more breathing room
    if (isFirstInvestigation) {
      cooldown *= 1.3;
    }

    // Max questions per burst
    const burstLimits: Record<PacingMode, number> = {
      calm: 3,
      attentive: 4,
      focused: 5,
      urgent: 6,
    };
    const maxBurst = burstLimits[mode];

    // Check if we need a reflective pause
    const shouldPause = consecutiveQuestions >= maxBurst || cognitiveLoadEstimate > 70;

    // Follow-up intensity (0-100)
    let followUpIntensity = 30; // Calm default
    if (mode === "attentive") followUpIntensity = 50;
    if (mode === "focused") followUpIntensity = 70;
    if (mode === "urgent") followUpIntensity = 85;
    // Reduce if cognitive load is high
    if (cognitiveLoadEstimate > 60) {
      followUpIntensity = Math.max(20, followUpIntensity - 20);
    }

    // Narrative complexity
    let narrativeComplexity: PacingState["narrativeComplexity"];
    if (cognitiveLoadEstimate > 70 || mode === "calm") narrativeComplexity = "simple";
    else if (mode === "urgent") narrativeComplexity = "detailed";
    else narrativeComplexity = "standard";

    // Explanation
    const explanations: Record<PacingMode, string> = {
      calm: "Taking a measured, unhurried approach to ensure comfort.",
      attentive: "Paying close attention while maintaining a comfortable pace.",
      focused: "Focusing more closely on this area — a few more targeted questions may follow.",
      urgent: "Given the nature of these symptoms, moving with more focus to ensure nothing is missed.",
    };

    return {
      mode,
      questionCooldownMs: Math.round(cooldown),
      maxQuestionsPerBurst: maxBurst,
      followUpIntensity,
      shouldInsertReflectivePause: shouldPause,
      narrativeComplexity,
      explanation: explanations[mode],
    };
  }, []);

  const recordQuestion = useCallback(() => {
    lastQuestionTimeRef.current = Date.now();
    burstCountRef.current += 1;
  }, []);

  const resetBurst = useCallback(() => {
    burstCountRef.current = 0;
  }, []);

  return { evaluatePacing, recordQuestion, resetBurst };
}

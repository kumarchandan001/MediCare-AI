/**
 * ClinicalSessionManager — Hook that manages the clinical interview API lifecycle.
 * Handles start, respond, reset, and orchestrates the analyzing pipeline.
 */
import { useCallback, useRef } from "react";
import { clinicalInterviewService } from "@/features/clinical-interview/api/clinicalInterview.service";
import { api } from "@/lib/apiClient";
import { useInvestigation } from "./InvestigationStateProvider";
import type { GovernanceResult, EmotionalSafetyResult } from "./InvestigationStateProvider";
import type { PredictionResult } from "@/features/prediction/types/prediction.types";
import { useRealismOrchestrator } from "@/features/clinical-realism/RealismValidationOrchestrator";
import { useGovernanceOrchestrator } from "@/features/clinical-governance/GovernanceOrchestrator";
import { useInvestigationRecovery } from "@/features/clinical-governance/resilience/InvestigationRecoveryManager";

export function useClinicalSession() {
  const inv = useInvestigation();
  const realism = useRealismOrchestrator();
  const governanceOrch = useGovernanceOrchestrator();
  const recovery = useInvestigationRecovery();
  const isStartingRef = useRef(false);
  const userId = "current_user"; // In production, pull from auth store

  // ── Start a new clinical interview ─────
  const startInterview = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      const data = await clinicalInterviewService.start(userId);
      inv.setSessionId(data.session_id);
      inv.setCurrentQuestion(data.next_question);
      inv.setInterviewState(data.state);
      inv.addConversationEntry({
        type: "question",
        text: data.next_question.text,
        stage: data.state.current_stage,
      });
    } catch (err) {
      console.error("Failed to start interview:", err);
    } finally {
      isStartingRef.current = false;
    }
  }, [inv, userId]);

  // ── Respond to a question ──────────────
  const respondToQuestion = useCallback(async (questionId: string, text: string) => {
    if (!inv.sessionId) return;

    // Add user answer to conversation
    inv.addConversationEntry({ type: "answer", text });

    try {
      const data = await clinicalInterviewService.respond(
        inv.sessionId, userId, questionId, text
      );

      // Check for escalation
      if (data.is_escalated && data.escalation_details) {
        inv.addConversationEntry({
          type: "escalation",
          text: data.escalation_details.reason,
          stage: data.state.current_stage,
        });
      }

      // Stage change detection
      const prevStage = inv.interviewState?.current_stage;
      if (prevStage && data.state.current_stage !== prevStage) {
        const stageLabels: Record<string, string> = {
          initial_intake: "Initial Intake",
          symptom_clarification: "Symptom Clarification",
          severity_exploration: "Severity Exploration",
          context_refinement: "Context Refinement",
          risk_assessment: "Risk Assessment",
          investigation_summary: "Investigation Summary",
          monitoring_recommendations: "Monitoring & Recommendations",
        };
        inv.addConversationEntry({
          type: "stage_change",
          text: stageLabels[data.state.current_stage] || data.state.current_stage,
          stage: data.state.current_stage,
        });
      }

      // Update state
      inv.setCurrentQuestion(data.next_question);
      inv.setInterviewState(data.state);

      // Add next question to conversation
      if (!data.is_escalated) {
        inv.addConversationEntry({
          type: "question",
          text: data.next_question.text,
          stage: data.state.current_stage,
        });
      }

      return data;
    } catch (err) {
      console.error("Failed to process response:", err);
      throw err;
    }
  }, [inv, userId]);

  // ── Run the full investigation pipeline ─
  const runInvestigationPipeline = useCallback(async (symptoms: string[]) => {
    if (symptoms.length === 0) return;
    inv.setPhase("analyzing");

    try {
      // 1) Run prediction
      const predResult: PredictionResult = await api.post("/prediction/predict", {
        symptoms,
      });
      inv.setPredictionResult(predResult);

      // 2) Run governance pipeline in parallel
      const govPromise = api.post<{ data: GovernanceResult }>("/governance/safety-pipeline", {
        session_id: `pred-${Date.now()}`,
        hypotheses: [
          { condition: predResult.predicted_disease, confidence: predResult.confidence / 100 },
          ...(predResult.xai.alternative_diagnoses || []).slice(0, 2).map(a => ({
            condition: a.disease,
            confidence: (typeof a.probability === "number" ? a.probability : 0) / 100,
          })),
        ],
        observations: symptoms.map(s => ({ symptom: s })),
        narrative_text: predResult.xai.xai_summary || "",
        contradiction_count: 0,
        evidence_sufficiency: predResult.xai.evidence_score ?? 0.5,
      }).catch(() => null);

      // 3) Run emotional safety in parallel
      const emotionalPromise = api.post<{ data: EmotionalSafetyResult }>("/governance/emotional-safety", {
        session_id: `pred-${Date.now()}`,
        narrative: predResult.xai.xai_summary || predResult.description || "",
        hypotheses_count: 1 + (predResult.xai.alternative_diagnoses?.length || 0),
        evidence_items: predResult.xai.feature_contributions?.length || 0,
        contradiction_count: 0,
        escalation_level: "routine",
      }).catch(() => null);

      const [govRes, emotionalRes] = await Promise.all([govPromise, emotionalPromise]);

      if (govRes) {
        const govData = (govRes as any)?.data || govRes;
        inv.setGovernance(govData);
      }
      if (emotionalRes) {
        const emotData = (emotionalRes as any)?.data || emotionalRes;
        inv.setEmotionalSafety(emotData);
      }

      // 4) Run Phase 4 Comprehensive Realism Validation
      const govDataForRealism = (govRes as any)?.data || govRes;
      const rawEscalation = govDataForRealism?.escalation?.escalation_level || "routine";
      const evidenceStrength = predResult.xai.evidence_score && predResult.xai.evidence_score > 0.7 ? "strong" : "moderate";
      
      const validationResult = realism.validateFull({
        rawHypotheses: [
          { condition: predResult.predicted_disease, confidence: predResult.confidence },
          ...(predResult.xai.alternative_diagnoses || []).slice(0, 4).map(a => ({
            condition: a.disease,
            confidence: typeof a.probability === "number" ? a.probability : 0,
          }))
        ],
        rawEscalation,
        rawSeverity: predResult.confidence > 70 ? 50 : 25,
        evidenceStrength,
        activeSymptoms: symptoms,
        hasCriticalTrigger: false,
        currentHR: 72,
        currentHRV: 45,
        wearableDriftDetected: false,
        daysUnresolved: 1,
        contradictionCount: 0,
        consecutiveQuestions: inv.conversation.length,
        cognitiveLoadEstimate: Math.min(80, inv.conversation.length * 8),
        isFirstInvestigation: inv.longitudinalHistory.length === 0,
        userResponseSpeed: 5000,
      });
      
      inv.setRealismValidation(validationResult as any);

      // 5) Phase 5: Run Governance Orchestration Pass
      try {
        const govPass = governanceOrch.runGovernancePass({
          realismReport: validationResult as any,
          sessionId: `pred-${Date.now()}`,
          investigationId: `inv-${Date.now()}`,
          activeSymptoms: symptoms,
          investigationPhase: "investigation",
          conversationTurns: inv.conversation.length,
          isFirstInvestigation: inv.longitudinalHistory.length === 0,
          wearableConnected: true,
          humanReviewRecommended: false,
        });
        console.log("[Phase5] Governance pass:", govPass.verdict.isSafe ? "SAFE" : "FLAGGED",
          `| Trust Δ: ${govPass.verdict.trustDelta} | Flags: ${govPass.analysis.safetyFlags.length}`);
      } catch (govErr) {
        console.warn("[Phase5] Governance pass failed (non-blocking):", govErr);
      }

      // 6) Save recovery checkpoint
      recovery.saveCheckpoint({
        investigationId: `inv-${Date.now()}`,
        sessionId: inv.sessionId || `pred-${Date.now()}`,
        timestamp: Date.now(),
        phase: "investigation",
        symptoms,
        conversation: inv.conversation.map(c => ({ type: c.type, text: c.text })),
      });

      // Add longitudinal entry
      inv.addLongitudinalEntry({
        id: `inv-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        primaryFinding: predResult.predicted_disease,
        confidence: predResult.confidence,
        symptoms,
        escalationLevel: "routine",
      });

      // Transition to investigation phase
      setTimeout(() => inv.setPhase("investigation"), 600);

    } catch (err) {
      console.error("Investigation pipeline failed:", err);
      inv.setPhase("intake");
    }
  }, [inv]);

  // ── Complete interview and run pipeline ─
  const completeInterview = useCallback(async () => {
    const symptoms = inv.interviewState?.active_symptoms || [];
    const allSymptoms = [...new Set([...symptoms, ...inv.manuallyAddedSymptoms])];
    await runInvestigationPipeline(allSymptoms);
  }, [inv, runInvestigationPipeline]);

  // ── Reset everything ───────────────────
  const resetSession = useCallback(async () => {
    if (inv.sessionId) {
      try { await clinicalInterviewService.reset(inv.sessionId); } catch {}
    }
    inv.resetInvestigation();
  }, [inv]);

  return {
    startInterview,
    respondToQuestion,
    runInvestigationPipeline,
    completeInterview,
    resetSession,
    isInterviewActive: !!inv.sessionId,
  };
}

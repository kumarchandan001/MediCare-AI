/**
 * Clinical Interview Service — API layer for adaptive clinical investigation
 */
import { api } from "@/lib/apiClient";

export interface InterviewQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

export interface ReasoningMetadata {
  active_domain: string;
  severity_risk_state: string;
  evidence_sufficiency: string;
  reasoning_confidence: number;
  contradiction_signals: string[];
  hypotheses_preview: { condition: string; confidence: number }[];
}

export interface InterviewState {
  current_stage: string;
  investigation_completeness: number;
  remaining_ambiguity: number;
  active_symptoms: string[];
  severity_indicators: string[];
  reasoning_metadata: ReasoningMetadata;
}

export interface InterviewResponse {
  session_id: string;
  next_question: InterviewQuestion;
  state: InterviewState;
  is_escalated?: boolean;
  escalation_details?: {
    is_escalated: boolean;
    reason: string;
    action: string;
  };
}

export const clinicalInterviewService = {
  start: (userId: string) =>
    api.post<InterviewResponse>("/clinical-interview/start", { user_id: userId }),

  respond: (sessionId: string, userId: string, questionId: string, text: string) =>
    api.post<InterviewResponse>("/clinical-interview/respond", {
      session_id: sessionId,
      user_id: userId,
      question_id: questionId,
      text,
    }),

  getState: (sessionId: string) =>
    api.get<InterviewState>("/clinical-interview/state", { session_id: sessionId }),

  reset: (sessionId: string) =>
    api.post("/clinical-interview/reset", { session_id: sessionId }),

  getHistory: (userId: string) =>
    api.get("/clinical-interview/history", { user_id: userId }),
};

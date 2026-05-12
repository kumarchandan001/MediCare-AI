/**
 * Clinical Governance Service — API layer for safety, trust, and emotional safety
 */
import { api } from "@/lib/apiClient";

export interface GovernanceResult {
  is_safe: boolean;
  governed_hypotheses: any[];
  confidence_adjustments: { condition: string; raw: number; governed: number; reasons: string[] }[];
  escalation: EscalationData;
  uncertainty: { is_safe: boolean; violations: any[]; warnings: any[] };
  safety: { is_safe: boolean; violations: any[]; safe_text: string; disclaimer: string };
  ambiguity: { ambiguity_score: number; ambiguity_level: string; should_preserve: boolean; summary: string };
  human_review: HumanReviewData;
  ethics: { is_ethical: boolean; violations: any[] };
  summary: string;
}

export interface EscalationData {
  escalation_level: string;
  is_emergency: boolean;
  emergency_symptoms?: string[];
  reasons?: string[];
  action: string;
  bypass_reasoning: boolean;
  summary: string;
}

export interface HumanReviewData {
  should_recommend_review: boolean;
  triggers: { type: string; reason: string; urgency: string }[];
  trigger_count: number;
  urgency: string;
  recommendation: string;
  summary: string;
}

export interface EmotionalSafetyResult {
  safe_narrative: string;
  escalation_message: string;
  emotional_safety_score: number;
  is_emotionally_safe: boolean;
  summary: string;
}

export interface GovernancePayload {
  session_id: string;
  hypotheses: any[];
  observations: any[];
  narrative_text?: string;
  severity_score?: number;
  deterioration_score?: number;
  contradiction_count?: number;
  evidence_sufficiency?: number;
  wearable_trust?: number;
  reasoning_stability?: number;
  escalation_active?: boolean;
  unresolved_hours?: number;
}

export const governanceService = {
  runSafetyPipeline: (data: GovernancePayload) =>
    api.post<{ data: GovernanceResult }>("/governance/safety-pipeline", data),

  applyEmotionalSafety: (data: GovernancePayload) =>
    api.post<{ data: EmotionalSafetyResult }>("/governance/emotional-safety", data),

  checkEscalation: (data: GovernancePayload) =>
    api.post<{ data: EscalationData }>("/governance/escalation-check", data),

  checkHumanReview: (data: GovernancePayload) =>
    api.post<{ data: HumanReviewData }>("/governance/human-review-check", data),

  getPolicies: () =>
    api.get<{ data: any }>("/governance/policies"),

  getMetrics: () =>
    api.get<{ data: any }>("/governance/metrics"),

  getAuditLog: (sessionId: string) =>
    api.get<{ data: any[] }>(`/governance/audit/${sessionId}`),
};

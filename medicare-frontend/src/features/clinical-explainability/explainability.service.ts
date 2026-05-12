/**
 * Clinical Explainability Service — API layer for transparent reasoning
 */
import { api } from "@/lib/apiClient";

export interface ReasoningStep {
  type: string;
  title: string;
  items: { text: string; [key: string]: any }[];
}

export interface ReasoningChainData {
  detail_level: string;
  steps: ReasoningStep[];
  summary: string;
  escalation_explanation: string;
}

export interface EvidenceLandscapeData {
  strong_evidence: { symptom: string; condition: string; explanation: string }[];
  weak_evidence: { symptom: string; condition: string; explanation: string }[];
  missing_evidence: { symptom: string; condition: string; explanation: string }[];
  conflicting_evidence: { symptom: string; condition: string; explanation: string }[];
  wearable_evidence: { metric: string; value: any; reliability: string; explanation: string }[];
  causal_links: { from: string; to: string; type: string; strength: number }[];
  sufficiency_score: number;
  summary: string;
}

export interface ContradictionData {
  contradictions: { type: string; label: string; explanation: string; severity: string }[];
  contradiction_count: number;
  overall_impact: string;
  confidence_reduction: number;
  resolution_suggestions: string[];
  summary: string;
  story?: { narrative: string; has_contradictions: boolean };
}

export interface UncertaintyData {
  uncertainty_level: string;
  uncertainty_score: number;
  sources: { type: string; explanation: string; impact: number }[];
  normalization_message: string;
  summary: string;
}

export interface DecisionData {
  decisions: { type: string; explanation: string; priority: string; action: string }[];
  priority_focus: string;
  summary: string;
}

export interface ConfidenceShiftData {
  shifts: { condition: string; previous: number; current: number; delta: number; direction: string; magnitude: string; explanation: string }[];
  stability: string;
  stability_score: number;
  summary: string;
}

export interface TrustIndicatorData {
  indicators: { type: string; label: string; value: number; status: string; explanation: string }[];
  overall_trust: number;
  summary: string;
}

export interface ReasoningStabilityData {
  state: string;
  stability_score: number;
  volatility: number;
  trend: string;
  explanation: string;
}

export interface InvestigationGraphData {
  nodes: { id: string; type: string; label: string; [key: string]: any }[];
  edges: { from: string; to: string; type: string; strength: number; label: string }[];
  focus_node: string | null;
  summary: string;
}

export interface EvidencePathwayData {
  pathways: { condition: string; confidence: number; evidence_chain: any[]; strength: string }[];
  strongest_pathway: any;
  summary: string;
}

export interface ClinicalStoryData {
  narrative: string;
  tone: string;
  detail_level: string;
  longitudinal?: { narrative: string; sessions_analyzed: number; continuity_score: number };
}

export interface ExplainabilityPayload {
  session_id: string;
  hypotheses: any[];
  observations: any[];
  severity_data?: any;
  escalation_data?: any;
  trajectory_data?: any;
  recovery_data?: any;
  wearable_data?: any;
  wearable_trust?: number;
  detail_level?: string;
  previous_hypotheses?: any[];
}

export const explainabilityService = {
  getReasoningChain: (data: ExplainabilityPayload) =>
    api.post<{ data: ReasoningChainData }>("/explainability/reasoning-chain", data),

  getEvidenceLandscape: (data: ExplainabilityPayload) =>
    api.post<{ data: EvidenceLandscapeData }>("/explainability/evidence-landscape", data),

  getContradictions: (data: ExplainabilityPayload) =>
    api.post<{ data: ContradictionData }>("/explainability/contradictions", data),

  getUncertainty: (data: ExplainabilityPayload) =>
    api.post<{ data: UncertaintyData }>("/explainability/uncertainty", data),

  getDecisions: (data: ExplainabilityPayload) =>
    api.post<{ data: DecisionData }>("/explainability/decisions", data),

  getConfidenceShifts: (data: ExplainabilityPayload) =>
    api.post<{ data: ConfidenceShiftData }>("/explainability/confidence-shifts", data),

  getTrustIndicators: (data: ExplainabilityPayload) =>
    api.post<{ data: TrustIndicatorData }>("/explainability/trust-indicators", data),

  getReasoningStability: (data: ExplainabilityPayload) =>
    api.post<{ data: ReasoningStabilityData }>("/explainability/reasoning-stability", data),

  getInvestigationGraph: (data: ExplainabilityPayload) =>
    api.post<{ data: InvestigationGraphData }>("/explainability/investigation-graph", data),

  getEvidencePathways: (data: ExplainabilityPayload) =>
    api.post<{ data: EvidencePathwayData }>("/explainability/evidence-pathways", data),

  getClinicalStory: (data: ExplainabilityPayload) =>
    api.post<{ data: ClinicalStoryData }>("/explainability/clinical-story", data),
};

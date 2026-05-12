/**
 * Differential Reasoning Service — API layer for differential diagnosis intelligence
 */
import { api } from "@/lib/apiClient";

export interface Hypothesis {
  condition: string;
  confidence: number;
  raw_score: number;
  severity_priority: number;
  trend: string;
  supporting_evidence: string[];
  conflicting_evidence: string[];
  contradiction_count?: number;
}

export interface WeightedEvidence {
  strong: string[];
  weak: string[];
  wearable_supported: string[];
  conflicting: string[];
  missing: string[];
  details: { symptom: string; reliability: number; reliability_label: string; source: string }[];
}

export interface Exclusion {
  condition: string;
  status: string;
  reasons: string[];
  confidence_impact: number;
}

export interface Comparison {
  condition_a: string;
  condition_b: string;
  confidence_a: number;
  confidence_b: number;
  confidence_gap: number;
  distinction_a: string;
  distinction_b: string;
  verdict: string;
}

export interface Stability {
  conditions: Record<string, { stability_score: number; is_volatile: boolean; label: string }>;
  volatile_count: number;
  overall_stability: string;
}

export interface Ambiguity {
  overall: number;
  dimensions: Record<string, number>;
  warnings: string[];
  level: string;
}

export interface EvolutionEntry {
  current: number;
  history: number[];
  delta: number;
  trend: string;
}

export interface DifferentialState {
  hypotheses: Hypothesis[];
  weighted_evidence: WeightedEvidence;
  exclusions: Exclusion[];
  comparisons: Comparison[];
  overlaps: any;
  stability: Stability;
  evolution: { step: number; evolution: Record<string, EvolutionEntry> };
  ambiguity: Ambiguity;
  strategy: { strategy: string; reason: string; target: string | null };
}

export const differentialReasoningService = {
  getDifferentialState: (sessionId: string) =>
    api.get<{ data: DifferentialState }>("/clinical-interview/differential-state", { session_id: sessionId }),

  getEvidenceMap: (sessionId: string) =>
    api.get("/clinical-interview/evidence-map", { session_id: sessionId }),

  getHypothesisEvolution: (sessionId: string) =>
    api.get("/clinical-interview/hypothesis-evolution", { session_id: sessionId }),

  getUncertaintyState: (sessionId: string) =>
    api.get<{ data: Ambiguity }>("/clinical-interview/uncertainty-state", { session_id: sessionId }),
};

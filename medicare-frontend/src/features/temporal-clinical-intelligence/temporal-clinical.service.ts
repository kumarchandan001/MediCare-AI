/**
 * Temporal Clinical Intelligence Service — API layer for continuous monitoring
 */
import { api } from "@/lib/apiClient";

export interface TrajectoryData {
  trajectory: string;
  stability_score: number;
  trend: string;
  volatility: number;
  explanation: string;
}

export interface DeteriorationData {
  is_deteriorating: boolean;
  score: number;
  velocity: number;
  type: string;
  domains: string[];
  explanation: string;
}

export interface RecoveryData {
  is_recovering: boolean;
  recovery_quality: number;
  consistency: number;
  fragility: number;
  relapse_probability: number;
  milestones: { label: string; reached: boolean }[];
  explanation: string;
}

export interface EscalationData {
  escalation_likelihood: number;
  trajectory: string;
  acceleration: number;
  should_alert: boolean;
  cooldown_active: boolean;
  explanation: string;
}

export interface SeverityData {
  severity_score: number;
  severity_level: string;
  explanation: string;
}

export interface TriageData {
  triage_level: string;
  urgency_score: number;
  action: string;
  explanation: string;
}

export interface FollowUpData {
  urgency: string;
  follow_up_hours: number;
  prompts: string[];
  type: string;
  reason: string;
}

export interface SymptomEvolutionData {
  changes: { symptom: string; trend: string; delta: number }[];
  new_symptoms: string[];
  resolved_symptoms: string[];
  persistent: string[];
  intermittent: string[];
  spreading: boolean;
  explanation: string;
}

export interface RecurrenceData {
  is_recurring: boolean;
  matching_episodes: number;
  recurrence_score: number;
  recurring_conditions: { condition: string; count: number }[];
  explanation: string;
}

export interface WearableTrustData {
  trust_score: number;
  is_reliable: boolean;
  anomalies_detected: number;
  consistency: number;
  explanation: string;
}

export interface LongitudinalSnapshot {
  trajectory: TrajectoryData;
  deterioration: DeteriorationData;
  recovery: RecoveryData;
  symptom_evolution: SymptomEvolutionData;
  recurrence: RecurrenceData;
  escalation: EscalationData;
  follow_up: FollowUpData;
  narrative: string;
}

export const temporalClinicalService = {
  recordSnapshot: (data: {
    session_id: string;
    user_id: string;
    severity: number;
    active_symptoms: string[];
    wearable?: Record<string, any>;
  }) => api.post("/temporal-clinical/record", data),

  getSnapshot: (sessionId: string, userId: string) =>
    api.get<{ data: LongitudinalSnapshot }>("/temporal-clinical/snapshot", {
      session_id: sessionId, user_id: userId,
    }),

  getSeverity: (sessionId: string) =>
    api.get<{ data: SeverityData }>("/temporal-clinical/severity", { session_id: sessionId }),

  getTriage: (sessionId: string) =>
    api.get<{ data: TriageData }>("/temporal-clinical/triage", { session_id: sessionId }),

  getTrajectory: (sessionId: string) =>
    api.get<{ data: TrajectoryData }>("/temporal-clinical/trajectory", { session_id: sessionId }),

  getRecovery: (sessionId: string) =>
    api.get<{ data: RecoveryData }>("/temporal-clinical/recovery", { session_id: sessionId }),

  getEscalation: (sessionId: string) =>
    api.get<{ data: EscalationData }>("/temporal-clinical/escalation", { session_id: sessionId }),

  getFollowUp: (sessionId: string, userId: string) =>
    api.get<{ data: FollowUpData }>("/temporal-clinical/follow-up", {
      session_id: sessionId, user_id: userId,
    }),

  getWearableTrust: (sessionId: string) =>
    api.get<{ data: WearableTrustData }>("/temporal-clinical/wearable-trust", { session_id: sessionId }),
};

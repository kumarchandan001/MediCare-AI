/**
 * Orchestration Types — Digital Twin & wellness orchestration models
 */

// ── Digital Twin State ───────────────────
export interface DigitalTwinState {
  twin_state: {
    stress_level: number;
    recovery_score: number;
    sleep_quality: number;
    activity_level: number;
    fatigue: number;
    resilience: number;
    wellness_score: number;
    burnout_risk: number;
  };
  profile: {
    stress_baseline: number;
    recovery_baseline: number;
    sleep_baseline: number;
    activity_baseline: number;
    fatigue_baseline: number;
    resilience_baseline: number;
  };
  identity: {
    archetype: string;
    stability_score: number;
    consistency: number;
    drift_magnitude: number;
  };
  data_quality: number;
  updated_at: string;
}

// ── Orchestration Cycle Report ───────────
export interface OrchestrationReport {
  interventions_delivered: number;
  agent_proposals: AgentProposal[];
  negotiation_result: NegotiationResult | null;
  energy_state: EnergyState;
  governance_report: GovernanceReport;
  alignment_report: AlignmentReport;
  timestamp: string;
}

export interface AgentProposal {
  agent_id: string;
  agent_name: string;
  priority: number;
  interventions: Intervention[];
  reasoning: string;
}

export interface Intervention {
  type: string;
  category: string;
  message: string;
  urgency: "low" | "medium" | "high" | "critical";
  confidence: number;
  explanation?: string;
}

export interface NegotiationResult {
  winning_agents: string[];
  resolved_conflicts: number;
  compromise_generated: boolean;
  final_interventions: Intervention[];
}

export interface EnergyState {
  cognitive_load: number;
  intervention_fatigue: number;
  recovery_bandwidth: number;
  emotional_energy: number;
  overload_risk: number;
  budget_remaining: number;
}

export interface GovernanceReport {
  passed: boolean;
  violations: string[];
  blocked_interventions: number;
  compliance_score: number;
}

export interface AlignmentReport {
  wellbeing_score: number;
  pacing_score: number;
  emotional_safety: number;
  sustainability: number;
  user_autonomy: number;
  overall_alignment: number;
}

// ── Simulation ───────────────────────────
export interface SimulationResult {
  scenarios: SimulationScenario[];
  generated_at: string;
  horizon_days: number;
}

export interface SimulationScenario {
  name: string;
  probability: number;
  trajectory: TrajectoryPoint[];
  outcome_summary: string;
}

export interface TrajectoryPoint {
  day: number;
  wellness_score: number;
  confidence: number;
  key_factors: string[];
}

// ── Resilience Growth ────────────────────
export interface ResilienceGrowth {
  current_score: number;
  growth_rate: number;
  phase: "building" | "stabilizing" | "growing" | "plateauing";
  milestones: ResilienceMilestone[];
  trend_data: { date: string; score: number }[];
}

export interface ResilienceMilestone {
  name: string;
  achieved: boolean;
  achieved_at?: string;
  description: string;
}

/**
 * Dashboard Types — Dashboard-specific data models
 */
import type { HealthSummary, RiskScore, InsightsResponse, AlertsResponse, HabitTip } from "./health.types";

// ── Dashboard State ──────────────────────
export interface DashboardData {
  summary: HealthSummary | null;
  riskScore: RiskScore | null;
  insights: InsightsResponse | null;
  alerts: AlertsResponse | null;
  habits: HabitTip[] | null;
  orchestration: OrchestrationSummary | null;
  wearableStatus: WearableConnectionStatus | null;
}

// ── Orchestration Summary (Step 5) ───────
export interface OrchestrationSummary {
  twin_state: TwinStateSnapshot;
  active_agents: AgentStatus[];
  energy_budget: EnergyBudget;
  governance_status: GovernanceStatus;
  last_orchestration: string;
}

export interface TwinStateSnapshot {
  wellness_score: number;
  stress_level: number;
  recovery_score: number;
  resilience_score: number;
  sleep_quality: number;
  activity_level: number;
  archetype: string;
  identity_stability: number;
  data_quality: number;
}

export interface AgentStatus {
  agent_id: string;
  name: string;
  status: "active" | "idle" | "paused" | "cooldown";
  last_action: string;
  priority: number;
  proposals_count: number;
}

export interface EnergyBudget {
  cognitive_load: number;
  intervention_fatigue: number;
  recovery_bandwidth: number;
  emotional_energy: number;
  overload_risk: number;
  budget_remaining: number;
}

export interface GovernanceStatus {
  ethical_compliance: boolean;
  boundary_violations: number;
  alignment_score: number;
  intervention_volume_ok: boolean;
  pacing_active: boolean;
}

// ── Wearable Connection ──────────────────
export interface WearableConnectionStatus {
  connected: boolean;
  provider: string;
  last_sync: string;
  sync_quality: "excellent" | "good" | "poor" | "disconnected";
  active_sensors: string[];
}

// ── Dashboard Widget ─────────────────────
export interface DashboardWidget {
  id: string;
  type: "metric" | "chart" | "insight" | "alert" | "status" | "action";
  title: string;
  size: "sm" | "md" | "lg" | "xl";
  visible: boolean;
  order: number;
}

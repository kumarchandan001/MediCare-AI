/**
 * Health Domain Types — Core health data models
 */

// ── Health Summary ───────────────────────
export interface HealthSummary {
  wellness_score: number;
  recovery_score: number;
  strain_score: number;
  sleep: number;
  sleep_trend?: "up" | "down" | "stable";
  sleep_progress: number;
  steps: number;
  steps_trend?: "up" | "down" | "stable";
  steps_progress: number;
  water: number;
  water_trend?: "up" | "down" | "stable";
  water_progress: number;
  bmi: number;
  bmi_progress: number;
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  stress_level: number;
  active_minutes: number;
}

// ── Vital Signs ──────────────────────────
export interface VitalSigns {
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  blood_oxygen: number;
  body_temperature: number;
  respiratory_rate: number;
  hrv_ms?: number;
  timestamp: string;
}

// ── Health Metric ────────────────────────
export interface HealthMetric {
  label: string;
  value: number;
  unit?: string;
  icon: string;
  color: string;
  trend?: "up" | "down" | "stable";
  progress: number;
  status?: "normal" | "elevated" | "low" | "critical";
}

// ── Alert ────────────────────────────────
export interface HealthAlert {
  id: string;
  type: "info" | "warning" | "danger" | "recovery";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  source?: string;
  action_url?: string;
}

export interface AlertsResponse {
  alerts: HealthAlert[];
  critical_count: number;
  unread_count: number;
}

// ── Insight ──────────────────────────────
export interface HealthInsight {
  id: string;
  type: "positive" | "warning" | "neutral" | "recommendation";
  message: string;
  confidence: number;
  source: string;
  timestamp: string;
  expandable?: boolean;
  explanation?: string;
}

export interface InsightsResponse {
  insights: HealthInsight[];
  generated_at: string;
}

// ── Risk Score ───────────────────────────
export interface RiskScore {
  overall_risk: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  factors: RiskFactor[];
  last_updated: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  trend: "improving" | "worsening" | "stable";
  description: string;
}

// ── Habit Tip ────────────────────────────
export interface HabitTip {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
}

// ── Health History ────────────────────────
export interface HealthHistoryEntry {
  date: string;
  wellness_score: number;
  recovery_score: number;
  strain_score: number;
  sleep_hours: number;
  steps: number;
  heart_rate: number;
  stress_level: number;
}

export type HealthTrend = "up" | "down" | "stable";

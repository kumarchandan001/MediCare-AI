export interface MetricTrend {
  direction: "up" | "down" | "flat";
  value: number;
  label: string;
}

export interface HealthSummary {
  sleep: number;
  heart_rate: number;
  stress: number;
  oxygen: number;
  steps: number;
  calories: number;
  water: number;
  bmi: number;
  bmi_category: string;
  sleep_trend: MetricTrend;
  steps_trend: MetricTrend;
  water_trend: MetricTrend;
  sleep_progress: number;
  steps_progress: number;
  water_progress: number;
  bmi_progress: number;
  sleep_history: number[];
  steps_history: number[];
  hr_history: number[];
  stress_history: number[];
  chart_labels: string[];
  record_count: number;
  days: number;
}

export interface RiskScore {
  score: number;
  level: "low" | "moderate" | "high" | "critical" | "unknown";
  color: string;
  reasons: string[];
  factors: Record<string, string>;
}

export interface InsightItem {
  type: "good" | "warning" | "danger" | "info";
  message: string;
  icon?: string;
}

export interface InsightsData {
  insights: InsightItem[];
  count: number;
}

export interface AlertItem {
  id: number;
  title: string;
  message?: string;
  severity: "low" | "medium" | "high" | "critical";
  category?: string;
  is_read: boolean;
  time_ago: string;
}

export interface AlertsData {
  alerts: AlertItem[];
  count: number;
  critical_count: number;
  unread_count: number;
}

export interface HabitTip {
  title: string;
  tip: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: string;
  icon: string;
}

export interface HabitsData {
  tips: HabitTip[];
  focus_area: string;
  count: number;
}

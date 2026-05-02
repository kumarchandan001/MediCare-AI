export type ReportPeriod = 7 | 30 | 90;

export interface MetricStat {
  current: number;
  previous: number;
  change: number;
  change_pct: number;
  trend: "up" | "down" | "flat";
  unit: string;
  label: string;
}

export interface ReportsOverview {
  period_days: number;
  record_count: number;
  active_days: number;
  completion_pct: number;
  sleep: MetricStat;
  heart_rate: MetricStat;
  oxygen: MetricStat;
  stress: MetricStat;
  steps: MetricStat;
  bmi?: MetricStat;
  overall_score: number;
  score_trend: string;
  best_metric: string;
  worst_metric: string;
}

export interface TrendPoint {
  date: string;
  value: number | null;
  label: string;
}

export interface MetricTrendSeries {
  metric: string;
  label: string;
  unit: string;
  color: string;
  data: TrendPoint[];
  average: number;
  min_val: number;
  max_val: number;
}

export interface TrendsResponse {
  period_days: number;
  sleep: MetricTrendSeries;
  heart_rate: MetricTrendSeries;
  oxygen: MetricTrendSeries;
  stress: MetricTrendSeries;
  steps: MetricTrendSeries;
}

export interface AISummaryHighlight {
  type: "good" | "warning" | "danger" | "info";
  text: string;
}

export interface AISummaryResponse {
  summary: string;
  highlights: AISummaryHighlight[];
  action_items: string[];
  score: number;
  grade: string;
  generated_at: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_logged: number;
  this_week: number;
  this_month: number;
}

export interface ReportStats {
  streaks: StreakData;
  total_vitals: number;
  total_activity: number;
  avg_sleep: number;
  avg_hr: number;
  avg_steps: number;
  avg_stress: number;
  bmi?: number;
  bmi_category?: string;
  days_logged: number;
  period_days: number;
}

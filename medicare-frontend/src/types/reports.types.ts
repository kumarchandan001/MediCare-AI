/**
 * Reports Types — Health report models
 */

export interface ReportOverview {
  period: string;
  wellness_average: number;
  recovery_average: number;
  total_active_days: number;
  total_alerts: number;
  improvement_areas: string[];
  strengths: string[];
}

export interface ReportTrend {
  metric: string;
  data: { date: string; value: number }[];
  average: number;
  trend: "improving" | "declining" | "stable";
  change_percent: number;
}

export interface AIReportSummary {
  summary: string;
  key_findings: string[];
  recommendations: string[];
  generated_at: string;
  confidence: number;
}

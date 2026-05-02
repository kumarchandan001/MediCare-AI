import { api } from "@/lib/apiClient";
import type {
  HealthSummary,
  RiskScore,
  InsightsData,
  AlertsData,
  HabitsData,
} from "../types/dashboard.types";

export const dashboardApi = {
  getSummary: (days = 7) =>
    api.get<HealthSummary>("/health/summary", { days }),

  getRiskScore: () =>
    api.get<RiskScore>("/health/risk-score"),

  getInsights: () =>
    api.get<InsightsData>("/health/insights"),

  getAlerts: () =>
    api.get<AlertsData>("/health/alerts"),

  getHabitTips: () =>
    api.get<HabitsData>("/health/habits"),
};

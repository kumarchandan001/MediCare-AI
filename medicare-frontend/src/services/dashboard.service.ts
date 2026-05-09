/**
 * Dashboard Service — API layer for dashboard data
 */
import { api } from "@/lib/apiClient";
import type { HealthSummary, InsightsResponse, AlertsResponse, RiskScore, HabitTip } from "@/types/health.types";
import type { OrchestrationSummary, WearableConnectionStatus } from "@/types/dashboard.types";

export const dashboardService = {
  getHealthSummary: () =>
    api.get<HealthSummary>("/health/summary"),

  getRiskScore: () =>
    api.get<RiskScore>("/health/risk-score"),

  getInsights: () =>
    api.get<InsightsResponse>("/health/insights"),

  getAlerts: () =>
    api.get<AlertsResponse>("/alerts"),

  getHabitTips: () =>
    api.get<HabitTip[]>("/habits/tips"),

  getOrchestrationSummary: () =>
    api.get<OrchestrationSummary>("/digital-twin/wellness-orchestration"),

  getWearableStatus: () =>
    api.get<WearableConnectionStatus>("/wearable/status"),
};

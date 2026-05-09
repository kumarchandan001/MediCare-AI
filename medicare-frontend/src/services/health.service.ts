/**
 * Health Service — API layer for health intelligence data
 */
import { api } from "@/lib/apiClient";
import type { HealthSummary, VitalSigns, HealthHistoryEntry } from "@/types/health.types";

export const healthService = {
  getSummary: () =>
    api.get<HealthSummary>("/health/summary"),

  getVitals: () =>
    api.get<VitalSigns>("/health/vitals/latest"),

  getHistory: (days = 30) =>
    api.get<HealthHistoryEntry[]>("/health/history", { days }),

  getBMI: () =>
    api.get<{ bmi: number; category: string }>("/health/bmi"),

  getActivity: () =>
    api.get<{ steps: number; active_minutes: number; calories: number }>("/health/activity"),

  getTrends: (period = "7d") =>
    api.get<{ metric: string; data: { date: string; value: number }[] }[]>("/health/trends", { period }),

  logDailyCheckin: (data: Record<string, number>) =>
    api.post("/health/checkin", data),
};

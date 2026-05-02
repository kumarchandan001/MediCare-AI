import { api } from "@/lib/apiClient";
import type {
  ReportsOverview,
  TrendsResponse,
  AISummaryResponse,
  ReportStats,
} from "../types/reports.types";

export const reportsApi = {
  getOverview: (days: number) =>
    api.get<ReportsOverview>("/reports/overview", { days }),

  getTrends: (days: number) =>
    api.get<TrendsResponse>("/reports/trends", { days }),

  getAISummary: (days: number) =>
    api.get<AISummaryResponse>("/reports/ai-summary", { days }),

  getStats: (days: number) =>
    api.get<ReportStats>("/reports/stats", { days }),
};

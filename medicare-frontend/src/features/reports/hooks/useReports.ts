import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reportsApi";
import type { ReportPeriod } from "../types/reports.types";

export function useReports() {
  const [period, setPeriod] = useState<ReportPeriod>(7);

  const overview = useQuery({
    queryKey: ["reports", "overview", period],
    queryFn: () => reportsApi.getOverview(period),
    staleTime: 10 * 60 * 1000,
  });

  const trends = useQuery({
    queryKey: ["reports", "trends", period],
    queryFn: () => reportsApi.getTrends(period),
    staleTime: 15 * 60 * 1000,
  });

  const aiSummary = useQuery({
    queryKey: ["reports", "ai-summary", period],
    queryFn: () => reportsApi.getAISummary(period),
    staleTime: 30 * 60 * 1000,
  });

  const stats = useQuery({
    queryKey: ["reports", "stats", period],
    queryFn: () => reportsApi.getStats(30),
    staleTime: 15 * 60 * 1000,
  });

  return {
    period,
    setPeriod,
    overview: overview.data,
    overviewLoading: overview.isLoading,
    trends: trends.data,
    trendsLoading: trends.isLoading,
    aiSummary: aiSummary.data,
    aiSummaryLoading: aiSummary.isLoading,
    stats: stats.data,
    statsLoading: stats.isLoading,
  };
}

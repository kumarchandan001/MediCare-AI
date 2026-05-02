import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboardApi";
import {
  QUERY_KEYS,
  CACHE_TIMES,
  STALE_TIMES,
} from "@/config/constants";

export function useHealthSummary(days = 7) {
  return useQuery({
    queryKey: [...QUERY_KEYS.HEALTH_SUMMARY, days],
    queryFn: () => dashboardApi.getSummary(days),
    staleTime: STALE_TIMES.HEALTH_SUMMARY,
    gcTime: CACHE_TIMES.HEALTH_SUMMARY,
  });
}

export function useRiskScore() {
  return useQuery({
    queryKey: QUERY_KEYS.RISK_SCORE,
    queryFn: dashboardApi.getRiskScore,
    staleTime: STALE_TIMES.RISK_SCORE,
    gcTime: CACHE_TIMES.RISK_SCORE,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: ["health", "insights"],
    queryFn: dashboardApi.getInsights,
    staleTime: STALE_TIMES.HEALTH_SUMMARY,
    gcTime: CACHE_TIMES.HEALTH_SUMMARY,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: QUERY_KEYS.ALERTS,
    queryFn: dashboardApi.getAlerts,
    staleTime: STALE_TIMES.ALERTS,
    gcTime: CACHE_TIMES.ALERTS,
    refetchInterval: 60 * 1000,
  });
}

export function useHabitTips() {
  return useQuery({
    queryKey: QUERY_KEYS.HABIT_TIPS,
    queryFn: dashboardApi.getHabitTips,
    staleTime: STALE_TIMES.HABIT_TIPS,
    gcTime: CACHE_TIMES.HABIT_TIPS,
  });
}

import { useQuery } from "@tanstack/react-query";
import apiClient, { ApiResponse } from "@/lib/apiClient";

// ── Interfaces ──

export interface SmartwatchSummary {
  steps: number;
  sleep_hours: number;
  heart_rate: number;
  status: string;
}

export interface InsightData {
  insights: string[];
  score: number;
  status: string;
}

export interface Recommendation {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
  personalized?: boolean;
}

export interface RecommendationData {
  recommendations: Recommendation[];
  score: number;
  status: string;
}

export interface Risk {
  type: string;
  level: "high" | "medium" | "low";
  message: string;
}

export interface Alert {
  type: string;
  priority: "high" | "medium" | "low";
  message: string;
}

export interface RiskData {
  risks: Risk[];
  alerts: Alert[];
}

export interface DailySummaryData {
  summary: string;
  score: number;
  status: string;
}

export interface WeeklyReportData {
  report: string;
  trend: "improving" | "declining" | "stable" | "none";
  score: number;
  status: string;
}

// ── Hooks ──

export const useSmartwatchSummary = () => {
  return useQuery({
    queryKey: ["smartwatch", "summary"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<SmartwatchSummary>>("/health/smartwatch/summary");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 mins
  });
};

export const useInsights = () => {
  return useQuery({
    queryKey: ["smartwatch", "insights"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<InsightData>>("/health/smartwatch/insights");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useRecommendations = () => {
  return useQuery({
    queryKey: ["health", "recommendations"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RecommendationData>>("/health/recommendations");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useRisks = () => {
  return useQuery({
    queryKey: ["health", "risks"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RiskData>>("/health/risks");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useDailySummary = () => {
  return useQuery({
    queryKey: ["health", "summary", "daily"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DailySummaryData>>("/health/summary/daily");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useWeeklyReport = () => {
  return useQuery({
    queryKey: ["health", "report", "weekly"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<WeeklyReportData>>("/health/report/weekly");
      return response.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

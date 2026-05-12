/**
 * CollaborativeHealthInsights — Aggregates and presents health insights
 * designed for collaborative review between patient, AI, and clinical team.
 */
import { useCallback } from "react";

export interface CollaborativeInsight {
  id: string;
  category: "trend" | "risk" | "milestone" | "recommendation" | "question";
  title: string;
  patientPerspective: string;
  clinicalPerspective: string;
  aiConfidence: number;
  supportingData: string[];
  actionable: boolean;
  requiresClinicalInput: boolean;
}

export function useCollaborativeHealthInsights() {
  const generateInsights = useCallback((healthData: { domain: string; trend: string; score: number }[]): CollaborativeInsight[] => {
    return healthData.map((d, i) => ({
      id: `insight-${Date.now()}-${i}`,
      category: d.score < 40 ? "risk" as const : d.trend === "improving" ? "milestone" as const : "trend" as const,
      title: `${d.domain} — ${d.trend}`,
      patientPerspective: d.trend === "improving" ? `Your ${d.domain} has been getting better` : d.trend === "declining" ? `Your ${d.domain} needs attention` : `Your ${d.domain} is holding steady`,
      clinicalPerspective: `${d.domain} ${d.trend} trend (score: ${d.score}/100) — ${d.score < 40 ? "warrants clinical assessment" : "within expected range"}`,
      aiConfidence: Math.min(90, d.score + 20),
      supportingData: [`Longitudinal data across ${d.domain}`, `Trend analysis: ${d.trend}`],
      actionable: d.score < 50,
      requiresClinicalInput: d.score < 30,
    }));
  }, []);

  return { generateInsights };
}

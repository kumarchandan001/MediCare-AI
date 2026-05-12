/**
 * LongitudinalClinicalReview — Enables longitudinal review of health
 * trajectories for clinical collaboration and care continuity.
 */
import { useCallback } from "react";

export interface LongitudinalReview {
  id: string;
  timeSpan: { start: number; end: number };
  domains: { name: string; trajectory: "improving" | "stable" | "declining"; dataPoints: number }[];
  keyEvents: { event: string; date: number; significance: "high" | "moderate" | "low" }[];
  narrative: string;
  clinicalQuestions: string[];
}

export function useLongitudinalClinicalReview() {
  const generateReview = useCallback((domains: LongitudinalReview["domains"], events: LongitudinalReview["keyEvents"], months = 6): LongitudinalReview => {
    const declining = domains.filter(d => d.trajectory === "declining");
    const improving = domains.filter(d => d.trajectory === "improving");
    const questions: string[] = [];
    if (declining.length > 0) questions.push(`${declining.map(d => d.name).join(", ")} showing decline — clinical review recommended`);
    if (improving.length > 0) questions.push(`Positive trends in ${improving.map(d => d.name).join(", ")} — continue current approach?`);
    return {
      id: `lr-${Date.now()}`, timeSpan: { start: Date.now() - months * 30 * 86400000, end: Date.now() },
      domains, keyEvents: events,
      narrative: `${months}-month longitudinal review across ${domains.length} health domains. ${improving.length} improving, ${declining.length} declining, ${domains.length - improving.length - declining.length} stable.`,
      clinicalQuestions: questions,
    };
  }, []);

  return { generateReview };
}

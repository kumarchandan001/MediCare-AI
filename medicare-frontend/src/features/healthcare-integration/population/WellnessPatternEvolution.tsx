/**
 * WellnessPatternEvolution — Tracks how wellness patterns evolve
 * across populations and individuals over extended time periods.
 */
import { useCallback } from "react";

export interface WellnessEvolution {
  domain: string;
  timeSpanMonths: number;
  phases: { name: string; startMonth: number; endMonth: number; avgScore: number }[];
  overallTrajectory: "ascending" | "plateau" | "descending" | "cyclical";
  sustainabilityScore: number;
}

export function useWellnessPatternEvolution() {
  const analyzeEvolution = useCallback((domain: string, monthlyScores: number[]): WellnessEvolution => {
    const phases: WellnessEvolution["phases"] = [];
    const chunkSize = Math.max(3, Math.floor(monthlyScores.length / 4));
    for (let i = 0; i < monthlyScores.length; i += chunkSize) {
      const chunk = monthlyScores.slice(i, i + chunkSize);
      const avg = chunk.reduce((s, v) => s + v, 0) / chunk.length;
      phases.push({ name: `Phase ${phases.length + 1}`, startMonth: i, endMonth: Math.min(i + chunkSize, monthlyScores.length), avgScore: avg });
    }
    const firstAvg = phases[0]?.avgScore || 0;
    const lastAvg = phases[phases.length - 1]?.avgScore || 0;
    const trajectory = lastAvg > firstAvg + 5 ? "ascending" as const : lastAvg < firstAvg - 5 ? "descending" as const : "plateau" as const;
    const variance = monthlyScores.length > 1 ? monthlyScores.reduce((s, v) => s + (v - (monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length)) ** 2, 0) / monthlyScores.length : 0;
    return { domain, timeSpanMonths: monthlyScores.length, phases, overallTrajectory: trajectory, sustainabilityScore: Math.max(0, 100 - Math.sqrt(variance) * 2) };
  }, []);

  return { analyzeEvolution };
}

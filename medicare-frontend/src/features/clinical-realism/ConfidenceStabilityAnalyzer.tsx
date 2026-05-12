/**
 * ConfidenceStabilityAnalyzer — Deep analysis of confidence stability over time.
 * Computes rolling variance, detects oscillation patterns, and produces
 * a stability grade that other engines can use to decide whether the AI
 * should express caution or certainty in its narrative.
 */
import { useCallback, useRef } from "react";

export type StabilityGrade = "rock_solid" | "steady" | "variable" | "volatile" | "erratic";

export interface StabilityAnalysis {
  grade: StabilityGrade;
  rollingVariance: number;
  oscillationDetected: boolean;
  trendDirection: "rising" | "falling" | "stable" | "oscillating";
  confidenceFloor: number;
  confidenceCeiling: number;
  narrativeAdvice: string;
}

const WINDOW_SIZE = 8;

export function useConfidenceStability() {
  const windowRef = useRef<Map<string, number[]>>(new Map());

  const analyze = useCallback((condition: string, latestConfidence: number): StabilityAnalysis => {
    const window = windowRef.current.get(condition) || [];
    window.push(latestConfidence);
    if (window.length > WINDOW_SIZE) window.shift();
    windowRef.current.set(condition, window);

    if (window.length < 3) {
      return {
        grade: "steady",
        rollingVariance: 0,
        oscillationDetected: false,
        trendDirection: "stable",
        confidenceFloor: latestConfidence,
        confidenceCeiling: latestConfidence,
        narrativeAdvice: "Insufficient history for stability analysis.",
      };
    }

    // Rolling variance
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window.length;
    const stdDev = Math.sqrt(variance);

    // Detect oscillation: alternating up/down deltas
    let directionChanges = 0;
    for (let i = 2; i < window.length; i++) {
      const prevDelta = window[i - 1] - window[i - 2];
      const currDelta = window[i] - window[i - 1];
      if (prevDelta * currDelta < 0) directionChanges++;
    }
    const oscillationDetected = directionChanges >= Math.floor(window.length * 0.6);

    // Trend
    const firstHalf = window.slice(0, Math.floor(window.length / 2));
    const secondHalf = window.slice(Math.floor(window.length / 2));
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendDelta = secondMean - firstMean;

    let trendDirection: StabilityAnalysis["trendDirection"];
    if (oscillationDetected) trendDirection = "oscillating";
    else if (trendDelta > 5) trendDirection = "rising";
    else if (trendDelta < -5) trendDirection = "falling";
    else trendDirection = "stable";

    // Grade
    let grade: StabilityGrade;
    if (stdDev < 3) grade = "rock_solid";
    else if (stdDev < 8) grade = "steady";
    else if (stdDev < 15) grade = "variable";
    else if (stdDev < 25) grade = "volatile";
    else grade = "erratic";

    // Floor/Ceiling
    const confidenceFloor = Math.min(...window);
    const confidenceCeiling = Math.max(...window);

    // Narrative advice
    const adviceMap: Record<StabilityGrade, string> = {
      rock_solid: "Reasoning confidence has been highly stable. Current assessment can be stated with measured certainty.",
      steady: "Confidence has remained fairly consistent. Assessment can be shared with reasonable confidence.",
      variable: "Confidence has shown some variation. Assessment should be presented with appropriate caveats.",
      volatile: "Reasoning confidence has been fluctuating. Recommend expressing uncertainty openly and requesting more evidence.",
      erratic: "Confidence is unstable. The AI should emphasize that this assessment is preliminary and evolving.",
    };

    return {
      grade,
      rollingVariance: Math.round(variance * 10) / 10,
      oscillationDetected,
      trendDirection,
      confidenceFloor,
      confidenceCeiling,
      narrativeAdvice: adviceMap[grade],
    };
  }, []);

  const reset = useCallback(() => {
    windowRef.current.clear();
  }, []);

  return { analyze, reset };
}

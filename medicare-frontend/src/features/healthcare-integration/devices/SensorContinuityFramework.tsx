/**
 * SensorContinuityFramework — Ensures continuous health sensing
 * across device transitions, disconnections, and upgrades.
 */
import { useCallback } from "react";

export interface SensorContinuity {
  metric: string;
  primaryDevice: string;
  fallbackDevice: string | null;
  gapTolerance: number;
  currentGap: number;
  continuityScore: number;
  lastReading: number;
}

export function useSensorContinuityFramework() {
  const assessContinuity = useCallback((sensors: SensorContinuity[]): { overallScore: number; gaps: string[]; recommendations: string[] } => {
    const withGaps = sensors.filter(s => s.currentGap > s.gapTolerance);
    const avgScore = sensors.length > 0 ? sensors.reduce((sum, s) => sum + s.continuityScore, 0) / sensors.length : 0;
    const recommendations: string[] = [];
    withGaps.forEach(s => {
      if (s.fallbackDevice) recommendations.push(`Switch ${s.metric} to fallback device: ${s.fallbackDevice}`);
      else recommendations.push(`${s.metric} has no fallback — consider adding a secondary sensor`);
    });
    return { overallScore: Math.round(avgScore), gaps: withGaps.map(s => `${s.metric}: ${s.currentGap}min gap (tolerance: ${s.gapTolerance}min)`), recommendations };
  }, []);

  return { assessContinuity };
}

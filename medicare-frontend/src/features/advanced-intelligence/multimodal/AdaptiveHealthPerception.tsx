/**
 * AdaptiveHealthPerception — Dynamically adjusts health intelligence
 * sensitivity based on accumulated multimodal understanding of the user.
 */
import { useCallback, useRef } from "react";

export interface PerceptionProfile {
  userId: string;
  sensitivityLevel: "conservative" | "balanced" | "sensitive";
  knownPatterns: string[];
  falsePositiveRate: number;
  perceptionAccuracy: number;
  adaptationCount: number;
  lastCalibrated: number;
}

export interface PerceptionAdjustment {
  domain: string;
  previousThreshold: number;
  newThreshold: number;
  reason: string;
  confidence: number;
}

export function useAdaptiveHealthPerception() {
  const profile = useRef<PerceptionProfile>({ userId: "", sensitivityLevel: "balanced", knownPatterns: [], falsePositiveRate: 0.1, perceptionAccuracy: 70, adaptationCount: 0, lastCalibrated: Date.now() });

  const calibrate = useCallback((feedbackHistory: { alertId: string; wasUseful: boolean; domain: string }[]): PerceptionAdjustment[] => {
    if (feedbackHistory.length < 5) return [];
    const adjustments: PerceptionAdjustment[] = [];
    const byDomain = new Map<string, { useful: number; total: number }>();
    feedbackHistory.forEach(f => {
      const entry = byDomain.get(f.domain) || { useful: 0, total: 0 };
      entry.total++;
      if (f.wasUseful) entry.useful++;
      byDomain.set(f.domain, entry);
    });
    byDomain.forEach((stats, domain) => {
      const accuracy = stats.useful / stats.total;
      if (accuracy < 0.3) {
        adjustments.push({ domain, previousThreshold: 50, newThreshold: 70, reason: `Low usefulness rate (${Math.round(accuracy * 100)}%) — raising threshold to reduce noise`, confidence: 65 });
      } else if (accuracy > 0.8) {
        adjustments.push({ domain, previousThreshold: 50, newThreshold: 35, reason: `High usefulness rate (${Math.round(accuracy * 100)}%) — lowering threshold for earlier detection`, confidence: 75 });
      }
    });
    profile.current.adaptationCount++;
    profile.current.lastCalibrated = Date.now();
    return adjustments;
  }, []);

  const getProfile = useCallback(() => ({ ...profile.current }), []);

  return { calibrate, getProfile };
}

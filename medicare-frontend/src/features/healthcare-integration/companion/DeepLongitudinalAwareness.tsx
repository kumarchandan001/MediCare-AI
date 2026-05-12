/**
 * DeepLongitudinalAwareness — Provides the AI companion with deep
 * longitudinal health memory spanning the user's entire health journey.
 */
import { useCallback, useRef } from "react";

export interface LongitudinalMemory {
  totalMonths: number;
  healthEpochs: HealthEpoch[];
  keyTransitions: { from: string; to: string; date: number; significance: number }[];
  deepPatterns: string[];
  companionNarrative: string;
}

export interface HealthEpoch {
  name: string;
  startDate: number;
  endDate: number | null;
  dominantTheme: string;
  overallTrajectory: "positive" | "neutral" | "challenging";
  lessonsLearned: string[];
}

export function useDeepLongitudinalAwareness() {
  const epochs = useRef<HealthEpoch[]>([]);

  const addEpoch = useCallback((epoch: HealthEpoch): void => {
    epochs.current.push(epoch);
  }, []);

  const synthesize = useCallback((): LongitudinalMemory => {
    const all = epochs.current;
    const totalMonths = all.length > 0 ? Math.round((Date.now() - Math.min(...all.map(e => e.startDate))) / (30 * 86400000)) : 0;
    const transitions = all.slice(1).map((e, i) => ({ from: all[i].dominantTheme, to: e.dominantTheme, date: e.startDate, significance: 70 }));
    const patterns: string[] = [];
    const challengingCount = all.filter(e => e.overallTrajectory === "challenging").length;
    const positiveCount = all.filter(e => e.overallTrajectory === "positive").length;
    if (positiveCount > challengingCount) patterns.push("Overall positive health trajectory across your journey");
    if (challengingCount > 0 && positiveCount > challengingCount) patterns.push("You've shown resilience — recovering from challenging periods");
    const narrative = totalMonths > 12 ? `Over ${totalMonths} months together, I've seen your health journey through ${all.length} distinct phases` : totalMonths > 3 ? `In our ${totalMonths} months together, your health story is taking shape` : "We're just beginning to understand your health story together";
    return { totalMonths, healthEpochs: [...all], keyTransitions: transitions, deepPatterns: patterns, companionNarrative: narrative };
  }, []);

  return { addEpoch, synthesize };
}

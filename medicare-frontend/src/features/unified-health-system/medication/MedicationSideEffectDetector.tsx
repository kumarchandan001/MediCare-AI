/**
 * MedicationSideEffectDetector — Cross-references medication start dates
 * and logs with emerging symptoms in other domains (like sudden sleep drop,
 * emotional spikes, or fatigue) to detect potential side effects.
 */
import { useCallback } from "react";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

export interface SideEffectSignal {
  id: string;
  medicationName?: string;
  affectedDomain: HealthDomain;
  symptomType: string;
  confidence: number; // 0-100
  detectionDate: number;
  narrative: string;
  recommendation: string;
}

export function useMedicationSideEffectDetector() {
  const detect = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    recentMedicationChanges: { name: string; date: number; type: "started" | "dose_changed" }[],
    historyDays: number = 7
  ): SideEffectSignal[] => {
    const alerts: SideEffectSignal[] = [];
    const now = Date.now();

    // Only look at very recent medication changes (within historyDays)
    const activeChanges = recentMedicationChanges.filter(
      change => now - change.date < historyDays * 86_400_000
    );

    if (activeChanges.length === 0) return alerts;

    const sleep = signals.get("sleep");
    const emotional = signals.get("emotional");
    const activity = signals.get("activity");

    for (const change of activeChanges) {
      // Sudden Sleep Disruption
      if (sleep && sleep.trend === "declining" && sleep.score < 50) {
        alerts.push({
          id: `se-sleep-${change.name}-${now}`,
          medicationName: change.name,
          affectedDomain: "sleep",
          symptomType: "sleep_disruption",
          confidence: 65,
          detectionDate: now,
          narrative: `A recent decline in sleep quality coincides with starting ${change.name}.`,
          recommendation: "Monitor your sleep for a few more days. If it persists, mention it to your doctor.",
        });
      }

      // Emotional Volatility
      if (emotional && emotional.trend === "declining" && emotional.score < 40) {
        alerts.push({
          id: `se-emotional-${change.name}-${now}`,
          medicationName: change.name,
          affectedDomain: "emotional",
          symptomType: "mood_change",
          confidence: 60,
          detectionDate: now,
          narrative: `Lower emotional wellbeing scores detected shortly after your medication change.`,
          recommendation: "Some medications can affect mood. Keep tracking how you feel.",
        });
      }

      // Fatigue / Activity Drop
      if (activity && activity.trend === "declining" && activity.score < 40) {
        alerts.push({
          id: `se-fatigue-${change.name}-${now}`,
          medicationName: change.name,
          affectedDomain: "activity",
          symptomType: "fatigue",
          confidence: 70,
          detectionDate: now,
          narrative: `Your activity levels dropped significantly after changing ${change.name}, suggesting possible fatigue.`,
          recommendation: "Rest if you feel unusually tired, and note if this fatigue improves over the next week.",
        });
      }
    }

    // Deduplicate and return highest confidence
    return alerts.sort((a, b) => b.confidence - a.confidence);
  }, []);

  return { detect };
}

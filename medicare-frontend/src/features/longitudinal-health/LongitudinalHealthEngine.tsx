/**
 * LongitudinalHealthEngine — Hook that processes temporal intelligence.
 * Bridges the TemporalHealthStateProvider with the temporal-clinical API
 * and generates adaptive narratives, follow-ups, and pattern insights.
 */
import { useCallback, useRef } from "react";
import { useTemporalHealth } from "./TemporalHealthStateProvider";
import { temporalClinicalService } from "@/features/temporal-clinical-intelligence/temporal-clinical.service";
import type { LongitudinalSnapshot } from "@/features/temporal-clinical-intelligence/temporal-clinical.service";

export function useLongitudinalEngine() {
  const temporal = useTemporalHealth();
  const isFetchingRef = useRef(false);

  // ── Record investigation and generate longitudinal context ─
  const recordCompletedInvestigation = useCallback(async (data: {
    id: string;
    primaryFinding: string;
    confidence: number;
    symptoms: string[];
    escalationLevel: string;
    governanceSummary?: string;
  }) => {
    const investigation = {
      ...data,
      date: new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      outcome: "monitoring" as const,
    };

    temporal.addInvestigation(investigation);
    temporal.detectPatterns(data.symptoms);
    temporal.startRecoveryTracking(data.primaryFinding);

    // Generate follow-up
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    temporal.addFollowUp({
      id: `fu-${Date.now()}`,
      investigationId: data.id,
      condition: data.primaryFinding,
      dueDate: followUpDate.toISOString().split("T")[0],
      urgency: "routine",
      reason: `Follow up on ${data.primaryFinding} investigation`,
      adaptivePrompts: generateAdaptivePrompts(data.primaryFinding, data.symptoms, temporal),
    });

    // Generate continuity narrative
    const priorCount = temporal.totalInvestigations;
    if (priorCount > 0) {
      temporal.addJourneyNarrative({
        type: "continuity",
        text: `Investigation #${priorCount + 1} completed. ${data.primaryFinding} identified with ${data.confidence.toFixed(0)}% confidence. The system continues to build your longitudinal health profile.`,
      });
    }
  }, [temporal]);

  // ── Fetch temporal snapshot from API ───
  const fetchTemporalSnapshot = useCallback(async (sessionId: string, userId: string): Promise<LongitudinalSnapshot | null> => {
    if (isFetchingRef.current) return null;
    isFetchingRef.current = true;
    try {
      const res = await temporalClinicalService.getSnapshot(sessionId, userId);
      const snapshot = (res as any)?.data || res;

      // Update wearable continuity from snapshot if available
      if (snapshot?.trajectory) {
        temporal.updateWearableContinuity({
          lastSyncTimestamp: Date.now(),
        });
      }

      // Update recovery from snapshot
      if (snapshot?.recovery && temporal.activeRecovery) {
        temporal.updateRecoveryProgress({
          stabilityScore: Math.round(snapshot.recovery.recovery_quality * 100),
          relapseProbability: snapshot.recovery.relapse_probability,
          trend: snapshot.recovery.is_recovering
            ? (snapshot.recovery.consistency > 0.6 ? "improving" : "stable")
            : "fragile",
        });
      }

      // Add narrative from snapshot
      if (snapshot?.narrative) {
        temporal.addJourneyNarrative({
          type: "awareness",
          text: snapshot.narrative,
        });
      }

      return snapshot;
    } catch (err) {
      console.error("Failed to fetch temporal snapshot:", err);
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, [temporal]);

  // ── Process daily check-in ─────────────
  const processDailyCheckin = useCallback((data: {
    mood: "good" | "okay" | "poor";
    reportedSymptoms: string[];
    energyLevel: number;
    sleepQuality: number;
    painLevel: number;
    notes: string;
  }) => {
    temporal.recordDailyStatus({
      ...data,
      wearableSynced: temporal.wearableContinuity.lastSyncTimestamp > 0,
      checkinCompleted: true,
    });

    // Detect patterns from daily symptoms
    if (data.reportedSymptoms.length > 0) {
      temporal.detectPatterns(data.reportedSymptoms);
    }

    // Update recovery if active
    if (temporal.activeRecovery) {
      const daysSinceStart = Math.ceil(
        (Date.now() - new Date(temporal.activeRecovery.startDate).getTime()) / 86400000
      );
      temporal.updateRecoveryProgress({
        currentDay: daysSinceStart,
        trend: data.mood === "good" && data.painLevel <= 3
          ? "improving"
          : data.mood === "poor" || data.painLevel >= 7
            ? "declining"
            : "stable",
      });
    }

    // Generate narrative
    const moodText = data.mood === "good" ? "positive" : data.mood === "poor" ? "challenging" : "steady";
    temporal.addJourneyNarrative({
      type: "continuity",
      text: `Daily check-in recorded: ${moodText} day with energy at ${data.energyLevel}%. ${
        data.reportedSymptoms.length > 0
          ? `${data.reportedSymptoms.length} symptom${data.reportedSymptoms.length > 1 ? "s" : ""} noted.`
          : "No new symptoms reported."
      }`,
    });
  }, [temporal]);

  // ── Generate contextual health summary ─
  const generateHealthSummary = useCallback((): string => {
    const parts: string[] = [];

    if (temporal.daysMonitored > 1) {
      parts.push(`Monitoring your health for ${temporal.daysMonitored} day${temporal.daysMonitored > 1 ? "s" : ""}.`);
    }

    if (temporal.totalInvestigations > 0) {
      parts.push(`${temporal.totalInvestigations} investigation${temporal.totalInvestigations > 1 ? "s" : ""} completed.`);
    }

    if (temporal.activeRecovery) {
      const recTrend = temporal.activeRecovery.trend === "improving"
        ? "Recovery indicators are trending positively"
        : temporal.activeRecovery.trend === "declining"
          ? "Some recovery metrics need attention"
          : "Recovery is progressing steadily";
      parts.push(`${recTrend} for ${temporal.activeRecovery.activeCondition} (day ${temporal.activeRecovery.currentDay}).`);
    }

    if (temporal.recurringPatterns.filter(p => p.severity !== "mild").length > 0) {
      parts.push("The system has identified recurring symptom patterns being monitored.");
    }

    if (temporal.healthTrend !== "unknown") {
      const trendText = temporal.healthTrend === "improving"
        ? "Overall health trajectory appears positive."
        : temporal.healthTrend === "declining"
          ? "The system is attentively monitoring some evolving patterns."
          : "Your health indicators remain generally stable.";
      parts.push(trendText);
    }

    return parts.join(" ") || "Continuous health monitoring is active. Begin an investigation or complete a daily check-in to build your health profile.";
  }, [temporal]);

  // ── Generate adaptive follow-up prompts ─
  const getAdaptiveFollowUpPrompts = useCallback((): string[] => {
    const prompts: string[] = [];

    if (temporal.activeRecovery) {
      prompts.push(`How is your ${temporal.activeRecovery.activeCondition} feeling today?`);
    }

    const recentSymptoms = temporal.dailyStatuses.slice(-3)
      .flatMap(s => s.reportedSymptoms)
      .filter((v, i, a) => a.indexOf(v) === i);

    if (recentSymptoms.length > 0) {
      const sym = recentSymptoms[0].replace(/_/g, " ");
      prompts.push(`Has your ${sym} changed since last time?`);
    }

    if (temporal.wearableContinuity.driftDetected) {
      prompts.push("Your wearable data shows some changes — how are you feeling physically?");
    }

    const recurringConcerns = temporal.recurringPatterns.filter(p => p.severity !== "mild");
    if (recurringConcerns.length > 0) {
      const sym = recurringConcerns[0].symptomCluster[0]?.replace(/_/g, " ") || "symptoms";
      prompts.push(`Your ${sym} has appeared ${recurringConcerns[0].occurrences} times — any changes today?`);
    }

    if (prompts.length === 0) {
      prompts.push("How are you feeling today?");
      prompts.push("Any new symptoms or changes to report?");
    }

    return prompts.slice(0, 3);
  }, [temporal]);

  return {
    recordCompletedInvestigation,
    fetchTemporalSnapshot,
    processDailyCheckin,
    generateHealthSummary,
    getAdaptiveFollowUpPrompts,
  };
}

function generateAdaptivePrompts(
  condition: string, symptoms: string[],
  temporal: ReturnType<typeof useTemporalHealth>
): string[] {
  const prompts = [`How is your ${condition} progressing?`];

  if (symptoms.length > 0) {
    prompts.push(`Has your ${symptoms[0].replace(/_/g, " ")} improved?`);
  }

  if (temporal.wearableContinuity.sleepScore.trend === "declining") {
    prompts.push("How has your sleep quality been?");
  }

  return prompts;
}

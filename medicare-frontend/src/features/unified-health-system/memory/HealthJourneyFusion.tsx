/**
 * HealthJourneyFusion — Merges discrete health events into coherent
 * journey arcs (e.g., "Cold → Recovery → Relapse → Full Recovery").
 * Detects patterns, recurring cycles, and milestone progressions.
 */
import { useCallback } from "react";
import type { HealthMemoryEntry } from "./UnifiedHealthMemory";
import type { HealthDomain } from "../UnifiedHealthEngine";

export interface JourneyArc {
  id: string;
  title: string;
  arcType: "illness_recovery" | "wellness_improvement" | "chronic_management" |
    "lifestyle_change" | "preventive_journey" | "general";
  startDate: number;
  endDate: number | null;     // null = ongoing
  status: "active" | "completed" | "stalled" | "recurring";
  phases: JourneyPhase[];
  involvedDomains: HealthDomain[];
  narrative: string;
  milestones: JourneyMilestone[];
}

export interface JourneyPhase {
  label: string;
  startDate: number;
  endDate: number | null;
  status: "completed" | "active" | "upcoming";
  score: number;
}

export interface JourneyMilestone {
  label: string;
  timestamp: number;
  significance: "minor" | "moderate" | "major";
  emoji: string;
}

export interface JourneyAnalysis {
  arcs: JourneyArc[];
  activeJourneys: number;
  completedJourneys: number;
  recurringPatterns: string[];
  overallNarrative: string;
}

export function useHealthJourneyFusion() {
  const analyzeJourneys = useCallback((entries: HealthMemoryEntry[]): JourneyAnalysis => {
    if (entries.length < 5) {
      return {
        arcs: [], activeJourneys: 0, completedJourneys: 0,
        recurringPatterns: [],
        overallNarrative: "Your health journey is just beginning. Events and patterns will emerge as your timeline grows.",
      };
    }

    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const arcs: JourneyArc[] = [];

    // ── Detect illness-recovery arcs ──
    const investigations = sorted.filter(e => e.entryType === "investigation");
    const recoveries = sorted.filter(e => e.entryType === "recovery_milestone");

    for (const inv of investigations) {
      const condition = inv.metadata?.primaryCondition as string || "Health Investigation";
      const invDate = inv.timestamp;

      // Find recovery entries within 60 days
      const relatedRecoveries = recoveries.filter(
        r => r.timestamp > invDate && r.timestamp < invDate + 60 * 86_400_000
      );

      const phases: JourneyPhase[] = [
        { label: "Investigation", startDate: invDate, endDate: invDate + 86_400_000, status: "completed", score: inv.score || 50 },
      ];

      if (relatedRecoveries.length > 0) {
        const lastRecovery = relatedRecoveries[relatedRecoveries.length - 1];
        phases.push({
          label: "Recovery",
          startDate: invDate + 86_400_000,
          endDate: lastRecovery.timestamp,
          status: (lastRecovery.score || 50) > 70 ? "completed" : "active",
          score: lastRecovery.score || 50,
        });
      }

      const lastPhase = phases[phases.length - 1];
      const isComplete = lastPhase.score > 70 && lastPhase.status === "completed";

      const milestones: JourneyMilestone[] = [
        { label: `Investigated: ${condition}`, timestamp: invDate, significance: "major", emoji: "🔬" },
      ];
      if (relatedRecoveries.length > 0) {
        milestones.push({
          label: "Recovery milestone reached",
          timestamp: relatedRecoveries[relatedRecoveries.length - 1].timestamp,
          significance: isComplete ? "major" : "moderate",
          emoji: isComplete ? "🎉" : "💪",
        });
      }

      arcs.push({
        id: `arc-${invDate}`,
        title: `${condition} Journey`,
        arcType: "illness_recovery",
        startDate: invDate,
        endDate: isComplete ? lastPhase.endDate : null,
        status: isComplete ? "completed" : "active",
        phases,
        involvedDomains: ["disease_intelligence", "recovery", "medication"],
        narrative: isComplete
          ? `You navigated ${condition} and reached full recovery. Well done.`
          : `You're currently recovering from ${condition}. Progress is being tracked.`,
        milestones,
      });
    }

    // ── Detect wellness improvement arcs ──
    const wellnessEntries = sorted.filter(e => e.domain === "wellness" && e.score != null);
    if (wellnessEntries.length >= 5) {
      const firstHalf = wellnessEntries.slice(0, Math.floor(wellnessEntries.length / 2));
      const secondHalf = wellnessEntries.slice(Math.floor(wellnessEntries.length / 2));
      const firstAvg = firstHalf.reduce((s, e) => s + (e.score || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, e) => s + (e.score || 0), 0) / secondHalf.length;

      if (secondAvg > firstAvg + 10) {
        arcs.push({
          id: `arc-wellness-${Date.now()}`,
          title: "Wellness Improvement",
          arcType: "wellness_improvement",
          startDate: wellnessEntries[0].timestamp,
          endDate: null,
          status: "active",
          phases: [
            { label: "Baseline", startDate: wellnessEntries[0].timestamp, endDate: firstHalf[firstHalf.length - 1].timestamp, status: "completed", score: Math.round(firstAvg) },
            { label: "Improvement", startDate: secondHalf[0].timestamp, endDate: null, status: "active", score: Math.round(secondAvg) },
          ],
          involvedDomains: ["wellness", "activity", "sleep"],
          narrative: `Your wellness has improved by ${Math.round(secondAvg - firstAvg)} points. Keep going!`,
          milestones: [
            { label: "Wellness trend identified", timestamp: secondHalf[0].timestamp, significance: "moderate", emoji: "📈" },
          ],
        });
      }
    }

    // ── Detect recurring patterns ──
    const recurringPatterns: string[] = [];
    const conditionCounts = new Map<string, number>();
    for (const inv of investigations) {
      const condition = inv.metadata?.primaryCondition as string;
      if (condition) conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + 1);
    }
    for (const [condition, count] of conditionCounts) {
      if (count >= 2) recurringPatterns.push(`${condition} (${count} occurrences)`);
    }

    const activeJourneys = arcs.filter(a => a.status === "active").length;
    const completedJourneys = arcs.filter(a => a.status === "completed").length;

    let overallNarrative: string;
    if (arcs.length === 0) {
      overallNarrative = "Your health timeline is growing. Journey arcs will appear as investigation and recovery patterns emerge.";
    } else if (activeJourneys > 0) {
      overallNarrative = `You have ${activeJourneys} active health journey${activeJourneys > 1 ? "s" : ""} in progress. ${completedJourneys > 0 ? `You've already successfully completed ${completedJourneys} journey${completedJourneys > 1 ? "s" : ""}.` : ""}`;
    } else {
      overallNarrative = `You've completed ${completedJourneys} health journey${completedJourneys > 1 ? "s" : ""}. Your resilience is building with each one.`;
    }

    return { arcs, activeJourneys, completedJourneys, recurringPatterns, overallNarrative };
  }, []);

  return { analyzeJourneys };
}

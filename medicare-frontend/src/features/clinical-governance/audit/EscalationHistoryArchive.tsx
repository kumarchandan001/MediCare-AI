/**
 * EscalationHistoryArchive — Dedicated archive for all escalation events.
 * Tracks escalation patterns over time for operational intelligence.
 * Supports escalation frequency analysis and pattern detection.
 */
import { useCallback, useRef } from "react";

export interface ArchivedEscalation {
  id: string;
  timestamp: number;
  sessionId: string;
  proposedLevel: string;
  finalLevel: string;
  wasModerated: boolean;
  moderationReason: string;
  triggerSymptoms: string[];
  relatedCondition: string;
  evidenceScore: number;
  governanceApproved: boolean;
}

export interface EscalationPattern {
  condition: string;
  totalEscalations: number;
  moderatedCount: number;
  averageLevel: string;
  frequency: "rare" | "occasional" | "frequent";
  trend: "stable" | "increasing" | "decreasing";
  lastOccurrence: number;
}

export interface EscalationAnalysis {
  totalEscalations: number;
  moderationRate: number;      // 0-1
  patterns: EscalationPattern[];
  recentEscalations: ArchivedEscalation[];
  riskAssessment: "low" | "moderate" | "elevated";
  narrative: string;
}

export function useEscalationHistoryArchive() {
  const archiveRef = useRef<ArchivedEscalation[]>(loadArchive());

  const archive = useCallback((entry: Omit<ArchivedEscalation, "id" | "timestamp">): ArchivedEscalation => {
    const full: ArchivedEscalation = {
      ...entry,
      id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    };
    archiveRef.current.push(full);
    if (archiveRef.current.length > 200) archiveRef.current = archiveRef.current.slice(-150);
    persistArchive(archiveRef.current);
    return full;
  }, []);

  const analyze = useCallback((): EscalationAnalysis => {
    const all = archiveRef.current;
    if (all.length === 0) {
      return {
        totalEscalations: 0, moderationRate: 0, patterns: [],
        recentEscalations: [], riskAssessment: "low",
        narrative: "No escalation events recorded.",
      };
    }

    const moderatedCount = all.filter(e => e.wasModerated).length;
    const moderationRate = moderatedCount / all.length;

    // Detect patterns by condition
    const byCondition = new Map<string, ArchivedEscalation[]>();
    for (const e of all) {
      const key = e.relatedCondition || "unknown";
      if (!byCondition.has(key)) byCondition.set(key, []);
      byCondition.get(key)!.push(e);
    }

    const patterns: EscalationPattern[] = [];
    for (const [condition, entries] of byCondition) {
      const modCount = entries.filter(e => e.wasModerated).length;
      const recent = entries.slice(-5);
      const isIncreasing = recent.length >= 3 && recent.slice(-3).every((_, i, arr) => i === 0 || arr[i].timestamp - arr[i - 1].timestamp < 86_400_000);

      patterns.push({
        condition,
        totalEscalations: entries.length,
        moderatedCount: modCount,
        averageLevel: getMostCommonLevel(entries),
        frequency: entries.length >= 5 ? "frequent" : entries.length >= 2 ? "occasional" : "rare",
        trend: isIncreasing ? "increasing" : "stable",
        lastOccurrence: entries[entries.length - 1].timestamp,
      });
    }

    const riskAssessment = moderationRate > 0.5 ? "elevated" : moderationRate > 0.2 ? "moderate" : "low";

    const narrative = `${all.length} escalation event${all.length !== 1 ? "s" : ""} recorded. ${moderatedCount} were moderated by governance (${(moderationRate * 100).toFixed(0)}%). ${patterns.filter(p => p.frequency === "frequent").length > 0 ? "Some conditions show frequent escalation patterns." : "Escalation frequency is within normal range."}`;

    return {
      totalEscalations: all.length,
      moderationRate,
      patterns: patterns.sort((a, b) => b.totalEscalations - a.totalEscalations),
      recentEscalations: all.slice(-5).reverse(),
      riskAssessment,
      narrative,
    };
  }, []);

  const getBySession = useCallback((sessionId: string) =>
    archiveRef.current.filter(e => e.sessionId === sessionId), []);

  return { archive, analyze, getBySession };
}

function getMostCommonLevel(entries: ArchivedEscalation[]): string {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.finalLevel] = (counts[e.finalLevel] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
}

function loadArchive(): ArchivedEscalation[] {
  try {
    const raw = localStorage.getItem("medicare_escalation_archive");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistArchive(entries: ArchivedEscalation[]) {
  try { localStorage.setItem("medicare_escalation_archive", JSON.stringify(entries)); }
  catch { /* degrade gracefully */ }
}

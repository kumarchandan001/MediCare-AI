/**
 * FailureAnalyticsDashboard — Analyzes failure patterns, tracks MTTR/MTBF,
 * and provides failure trend intelligence for operational improvement.
 */
import { useCallback, useRef } from "react";

export interface FailureRecord {
  id: string;
  subsystem: string;
  type: "crash" | "timeout" | "connection_lost" | "data_corruption" | "resource_exhaustion" | "logic_error";
  severity: "minor" | "major" | "critical";
  occurredAt: number;
  resolvedAt: number | null;
  rootCause: string | null;
  impactedUsers: number;
  autoRecovered: boolean;
}

export interface FailureAnalytics {
  totalFailures: number;
  mttr: number;           // Mean Time to Recovery (ms)
  mtbf: number;           // Mean Time Between Failures (ms)
  topSubsystems: { name: string; count: number }[];
  topTypes: { type: string; count: number }[];
  autoRecoveryRate: number;
  trendsImproving: boolean;
}

export function useFailureAnalyticsDashboard() {
  const records = useRef<FailureRecord[]>([]);

  const recordFailure = useCallback((failure: Omit<FailureRecord, "id">): FailureRecord => {
    const full: FailureRecord = { ...failure, id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` };
    records.current = [...records.current.slice(-499), full];
    return full;
  }, []);

  const analyze = useCallback((windowMs = 86400000): FailureAnalytics => {
    const cutoff = Date.now() - windowMs;
    const recent = records.current.filter(r => r.occurredAt > cutoff);
    const resolved = recent.filter(r => r.resolvedAt);
    const mttr = resolved.length > 0 ? resolved.reduce((s, r) => s + ((r.resolvedAt || 0) - r.occurredAt), 0) / resolved.length : 0;
    const sorted = [...recent].sort((a, b) => a.occurredAt - b.occurredAt);
    let mtbf = 0;
    if (sorted.length >= 2) {
      const gaps = sorted.slice(1).map((r, i) => r.occurredAt - sorted[i].occurredAt);
      mtbf = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    }
    const subsystemCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    recent.forEach(r => { subsystemCounts[r.subsystem] = (subsystemCounts[r.subsystem] || 0) + 1; typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
    // Trend: compare first half vs second half
    const mid = cutoff + windowMs / 2;
    const firstHalf = recent.filter(r => r.occurredAt < mid).length;
    const secondHalf = recent.filter(r => r.occurredAt >= mid).length;
    return {
      totalFailures: recent.length, mttr, mtbf,
      topSubsystems: Object.entries(subsystemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      topTypes: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count })),
      autoRecoveryRate: recent.length > 0 ? recent.filter(r => r.autoRecovered).length / recent.length : 0,
      trendsImproving: secondHalf < firstHalf,
    };
  }, []);

  return { recordFailure, analyze, getRecords: () => [...records.current] };
}

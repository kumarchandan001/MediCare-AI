/**
 * GovernanceMemoryLayer — Persistent governance state: past verdicts,
 * safety records, escalation patterns. Loaded from localStorage on app
 * init. Supports governance memory queries.
 */
import { useCallback, useMemo } from "react";

export interface GovernanceMemoryEntry {
  sessionId: string;
  timestamp: number;
  condition: string;
  verdict: "passed" | "moderated" | "blocked";
  escalationLevel: string;
  trustDelta: number;
  flagCount: number;
}

export interface GovernanceMemoryQuery {
  condition?: string;
  verdict?: string;
  dateRange?: { from: number; to: number };
}

const MEM_KEY = "medicare_governance_memory";

function loadMemory(): GovernanceMemoryEntry[] {
  try { return JSON.parse(localStorage.getItem(MEM_KEY) || "[]"); }
  catch { return []; }
}

function saveMemory(entries: GovernanceMemoryEntry[]) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(entries.slice(-200))); }
  catch { /* degrade */ }
}

export function useGovernanceMemory() {
  const entries = useMemo(() => loadMemory(), []);

  const remember = useCallback((entry: GovernanceMemoryEntry) => {
    entries.push(entry);
    saveMemory(entries);
  }, [entries]);

  const recall = useCallback((query: GovernanceMemoryQuery): GovernanceMemoryEntry[] => {
    let results = [...entries];
    if (query.condition) results = results.filter(e => e.condition === query.condition);
    if (query.verdict) results = results.filter(e => e.verdict === query.verdict);
    if (query.dateRange) results = results.filter(e => e.timestamp >= query.dateRange!.from && e.timestamp <= query.dateRange!.to);
    return results;
  }, [entries]);

  const wasConditionEscalatedBefore = useCallback((condition: string): boolean => {
    return entries.some(e => e.condition === condition && (e.escalationLevel === "critical" || e.escalationLevel === "emergency"));
  }, [entries]);

  const getConditionHistory = useCallback((condition: string) => {
    return entries.filter(e => e.condition === condition).sort((a, b) => a.timestamp - b.timestamp);
  }, [entries]);

  const getTrustTrend = useCallback((): { trend: "improving" | "stable" | "declining"; recentAvg: number } => {
    const recent = entries.slice(-10);
    if (recent.length < 3) return { trend: "stable", recentAvg: 0 };
    const avgDelta = recent.reduce((sum, e) => sum + e.trustDelta, 0) / recent.length;
    return {
      trend: avgDelta > 1 ? "improving" : avgDelta < -1 ? "declining" : "stable",
      recentAvg: avgDelta,
    };
  }, [entries]);

  return { remember, recall, wasConditionEscalatedBefore, getConditionHistory, getTrustTrend, totalEntries: entries.length };
}

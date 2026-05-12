/**
 * LongitudinalDecisionArchive — Long-term decision storage maintaining
 * a compressed history of all significant decisions. Links decisions
 * to investigations and conditions for cross-session traceability.
 */
import { useCallback, useRef } from "react";

export interface ArchivedDecision {
  id: string;
  timestamp: number;
  sessionId: string;
  investigationId: string;
  condition: string;
  decisionType: string;
  summary: string;
  confidence: number;
  escalation: string;
  wasModerated: boolean;
  governanceVerdict: string;
}

const ARCHIVE_KEY = "medicare_decision_archive";

export function useLongitudinalDecisionArchive() {
  const archive = useRef<ArchivedDecision[]>(load());

  const store = useCallback((decision: Omit<ArchivedDecision, "id" | "timestamp">): ArchivedDecision => {
    const full: ArchivedDecision = { ...decision, id: `da-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, timestamp: Date.now() };
    archive.current.push(full);
    if (archive.current.length > 300) archive.current = archive.current.slice(-200);
    persist(archive.current);
    return full;
  }, []);

  const queryByCondition = useCallback((condition: string) =>
    archive.current.filter(d => d.condition === condition).sort((a, b) => a.timestamp - b.timestamp), []);

  const queryBySession = useCallback((sessionId: string) =>
    archive.current.filter(d => d.sessionId === sessionId), []);

  const getDecisionTimeline = useCallback((condition: string): { date: string; summary: string; confidence: number }[] => {
    return queryByCondition(condition).map(d => ({
      date: new Date(d.timestamp).toLocaleDateString(),
      summary: d.summary,
      confidence: d.confidence,
    }));
  }, [queryByCondition]);

  const getModeratedHistory = useCallback(() =>
    archive.current.filter(d => d.wasModerated).slice(-20), []);

  return { store, queryByCondition, queryBySession, getDecisionTimeline, getModeratedHistory, totalDecisions: archive.current.length };
}

function load(): ArchivedDecision[] {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]"); } catch { return []; }
}
function persist(data: ArchivedDecision[]) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data)); } catch { /* */ }
}

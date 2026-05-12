/**
 * LongitudinalAuditMemory — Cross-session audit continuity: links audits
 * across separate investigations, detects audit gaps and integrity violations,
 * generates longitudinal accountability reports.
 */
import { useCallback, useRef } from "react";

export interface LongitudinalAuditSnapshot {
  sessionId: string;
  investigationId: string;
  timestamp: number;
  conditionTracked: string;
  confidenceAtTime: number;
  escalationAtTime: string;
  governanceVerdict: string;
  auditEntryCount: number;
  integrityHash: string;    // Simple hash for tamper detection
}

export interface AuditGap {
  type: "missing_session" | "integrity_violation" | "timeline_break" | "orphaned_escalation";
  description: string;
  affectedSessions: string[];
  severity: "low" | "medium" | "high";
  timestamp: number;
}

export interface LongitudinalAuditReport {
  totalSnapshots: number;
  timespan: { from: number; to: number };
  gaps: AuditGap[];
  integrityScore: number;
  continuityNarrative: string;
  sessionsTracked: number;
  conditionsTracked: string[];
}

const STORAGE_KEY = "medicare_longitudinal_audit";

export function useLongitudinalAuditMemory() {
  const snapshots = useRef<LongitudinalAuditSnapshot[]>(loadSnapshots());

  const recordSnapshot = useCallback((snapshot: Omit<LongitudinalAuditSnapshot, "integrityHash">): LongitudinalAuditSnapshot => {
    const hash = computeHash(snapshot);
    const full: LongitudinalAuditSnapshot = { ...snapshot, integrityHash: hash };
    snapshots.current.push(full);
    if (snapshots.current.length > 300) snapshots.current = snapshots.current.slice(-200);
    persistSnapshots(snapshots.current);
    return full;
  }, []);

  const detectGaps = useCallback((): AuditGap[] => {
    const gaps: AuditGap[] = [];
    const all = snapshots.current;

    if (all.length < 2) return gaps;

    // Check for timeline breaks (> 7 days between same condition)
    const byCondition = new Map<string, LongitudinalAuditSnapshot[]>();
    for (const s of all) {
      if (!byCondition.has(s.conditionTracked)) byCondition.set(s.conditionTracked, []);
      byCondition.get(s.conditionTracked)!.push(s);
    }

    for (const [condition, entries] of byCondition) {
      for (let i = 1; i < entries.length; i++) {
        const daysBetween = (entries[i].timestamp - entries[i - 1].timestamp) / 86_400_000;
        if (daysBetween > 7) {
          gaps.push({
            type: "timeline_break",
            description: `${daysBetween.toFixed(0)}-day gap in audit trail for "${condition}".`,
            affectedSessions: [entries[i - 1].sessionId, entries[i].sessionId],
            severity: daysBetween > 30 ? "high" : "medium",
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check for integrity violations (hash mismatch)
    for (const s of all) {
      const expectedHash = computeHash(s);
      if (s.integrityHash !== expectedHash) {
        gaps.push({
          type: "integrity_violation",
          description: `Audit entry for session ${s.sessionId} has been modified.`,
          affectedSessions: [s.sessionId],
          severity: "high",
          timestamp: Date.now(),
        });
      }
    }

    return gaps;
  }, []);

  const generateReport = useCallback((): LongitudinalAuditReport => {
    const all = snapshots.current;
    const gaps = detectGaps();

    const sessions = new Set(all.map(s => s.sessionId));
    const conditions = [...new Set(all.map(s => s.conditionTracked))];
    const timestamps = all.map(s => s.timestamp);

    const integrityViolations = gaps.filter(g => g.type === "integrity_violation").length;
    const integrityScore = Math.max(0, 100 - integrityViolations * 20 - gaps.filter(g => g.severity === "high").length * 10);

    let narrative: string;
    if (all.length === 0) {
      narrative = "No longitudinal audit data available yet.";
    } else if (gaps.length === 0) {
      narrative = `${all.length} audit snapshots across ${sessions.size} session(s) — longitudinal integrity is intact.`;
    } else {
      narrative = `${all.length} audit snapshots across ${sessions.size} session(s). ${gaps.length} gap(s) detected — governance is monitoring continuity.`;
    }

    return {
      totalSnapshots: all.length,
      timespan: { from: timestamps[0] || 0, to: timestamps[timestamps.length - 1] || 0 },
      gaps,
      integrityScore,
      continuityNarrative: narrative,
      sessionsTracked: sessions.size,
      conditionsTracked: conditions,
    };
  }, [detectGaps]);

  return { recordSnapshot, detectGaps, generateReport };
}

function computeHash(snapshot: Partial<LongitudinalAuditSnapshot>): string {
  const data = `${snapshot.sessionId}|${snapshot.investigationId}|${snapshot.timestamp}|${snapshot.conditionTracked}|${snapshot.confidenceAtTime}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

function loadSnapshots(): LongitudinalAuditSnapshot[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function persistSnapshots(data: LongitudinalAuditSnapshot[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* degrade gracefully */ }
}

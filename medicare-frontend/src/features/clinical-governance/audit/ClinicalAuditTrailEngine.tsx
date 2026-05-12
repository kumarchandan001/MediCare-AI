/**
 * ClinicalAuditTrailEngine — Core audit engine creating timestamped,
 * categorized audit entries. Supports investigation, escalation, wearable,
 * and monitoring audits with localStorage persistence and size management.
 */
import { useCallback, useRef } from "react";
import { AUDIT_THRESHOLDS } from "../guards/ClinicalSafetyThresholds";

export type AuditCategory = "investigation" | "escalation" | "safety" | "wearable" | "monitoring" | "recovery" | "privacy" | "governance";

export interface DetailedAuditEntry {
  id: string;
  timestamp: number;
  category: AuditCategory;
  subcategory: string;
  sessionId: string;
  action: string;
  detail: string;
  impact: "low" | "medium" | "high" | "critical";
  outcome: "passed" | "moderated" | "blocked" | "recovered" | "logged";
  traceId?: string;        // Links to decision trace
  lineageId?: string;      // Links to reasoning lineage
  relatedCondition?: string;
  evidenceSnapshot?: {
    symptomCount: number;
    hypothesisCount: number;
    confidenceLevel: number;
    escalationLevel: string;
    wearableReliability: number;
  };
  metadata?: Record<string, unknown>;
}

export interface AuditQuery {
  sessionId?: string;
  category?: AuditCategory;
  dateRange?: { from: number; to: number };
  impact?: DetailedAuditEntry["impact"];
  outcome?: DetailedAuditEntry["outcome"];
  condition?: string;
  limit?: number;
}

export interface AuditSummary {
  totalEntries: number;
  byCategory: Record<string, number>;
  byImpact: Record<string, number>;
  byOutcome: Record<string, number>;
  recentCritical: DetailedAuditEntry[];
  integrityScore: number;   // 0-100
  oldestEntry: number;
  newestEntry: number;
}

const AUDIT_STORAGE_KEY = "medicare_audit_trail";

export function useClinicalAuditTrail() {
  const entriesRef = useRef<DetailedAuditEntry[]>(loadEntries());

  const record = useCallback((entry: Omit<DetailedAuditEntry, "id" | "timestamp">): DetailedAuditEntry => {
    const full: DetailedAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    entriesRef.current.push(full);

    // Size management: keep within threshold
    if (entriesRef.current.length > AUDIT_THRESHOLDS.MAX_STORED_ENTRIES) {
      entriesRef.current = entriesRef.current.slice(-AUDIT_THRESHOLDS.MAX_STORED_ENTRIES);
    }

    // Age cleanup
    const cutoff = Date.now() - AUDIT_THRESHOLDS.MAX_ENTRY_AGE_MS;
    entriesRef.current = entriesRef.current.filter(e => e.timestamp >= cutoff);

    // Persist
    persistEntries(entriesRef.current);

    return full;
  }, []);

  const query = useCallback((q: AuditQuery): DetailedAuditEntry[] => {
    let results = [...entriesRef.current];

    if (q.sessionId) results = results.filter(e => e.sessionId === q.sessionId);
    if (q.category) results = results.filter(e => e.category === q.category);
    if (q.impact) results = results.filter(e => e.impact === q.impact);
    if (q.outcome) results = results.filter(e => e.outcome === q.outcome);
    if (q.condition) results = results.filter(e => e.relatedCondition === q.condition);
    if (q.dateRange) {
      results = results.filter(e => e.timestamp >= q.dateRange!.from && e.timestamp <= q.dateRange!.to);
    }
    if (q.limit) results = results.slice(-q.limit);

    return results;
  }, []);

  const getSummary = useCallback((): AuditSummary => {
    const entries = entriesRef.current;
    const byCategory: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      byImpact[e.impact] = (byImpact[e.impact] || 0) + 1;
      byOutcome[e.outcome] = (byOutcome[e.outcome] || 0) + 1;
    }

    const recentCritical = entries.filter(e => e.impact === "critical").slice(-5).reverse();
    const timestamps = entries.map(e => e.timestamp);

    // Integrity score: penalize gaps, missing categories, old-only entries
    const categoryCoverage = Object.keys(byCategory).length;
    const recencyBonus = entries.length > 0 && (Date.now() - timestamps[timestamps.length - 1]) < 3_600_000 ? 20 : 0;
    const integrityScore = Math.min(100, categoryCoverage * 10 + recencyBonus + (entries.length > 10 ? 30 : entries.length * 3));

    return {
      totalEntries: entries.length,
      byCategory,
      byImpact,
      byOutcome,
      recentCritical,
      integrityScore,
      oldestEntry: timestamps.length > 0 ? timestamps[0] : 0,
      newestEntry: timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0,
    };
  }, []);

  const getTrailForSession = useCallback((sessionId: string): DetailedAuditEntry[] => {
    return entriesRef.current.filter(e => e.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  return { record, query, getSummary, getTrailForSession };
}

function loadEntries(): DetailedAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistEntries(entries: DetailedAuditEntry[]) {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  } catch { /* storage full — degrade gracefully */ }
}

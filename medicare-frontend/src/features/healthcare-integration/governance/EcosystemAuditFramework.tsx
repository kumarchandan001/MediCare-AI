/**
 * EcosystemAuditFramework — Comprehensive audit framework for
 * tracking all ecosystem actions, decisions, and data flows.
 */
import { useCallback, useRef } from "react";

export interface AuditEvent {
  id: string;
  timestamp: number;
  category: "data_access" | "ai_decision" | "user_action" | "system_event" | "governance" | "integration";
  action: string;
  actor: string;
  resource: string;
  outcome: "success" | "failure" | "denied" | "escalated";
  metadata: Record<string, unknown>;
  retentionYears: number;
}

export interface AuditReport {
  period: { start: number; end: number };
  totalEvents: number;
  byCategory: Record<string, number>;
  failureRate: number;
  deniedAccessAttempts: number;
  complianceScore: number;
  anomalies: string[];
}

export function useEcosystemAuditFramework() {
  const events = useRef<AuditEvent[]>([]);

  const record = useCallback((event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent => {
    const full: AuditEvent = { ...event, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, timestamp: Date.now() };
    events.current = [...events.current.slice(-4999), full];
    return full;
  }, []);

  const generateReport = useCallback((startTime: number, endTime: number): AuditReport => {
    const filtered = events.current.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    const byCategory: Record<string, number> = {};
    filtered.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + 1; });
    const failures = filtered.filter(e => e.outcome === "failure").length;
    const denied = filtered.filter(e => e.outcome === "denied").length;
    const anomalies: string[] = [];
    if (denied > filtered.length * 0.1) anomalies.push("High rate of denied access attempts");
    if (failures > filtered.length * 0.05) anomalies.push("Elevated failure rate detected");
    return {
      period: { start: startTime, end: endTime }, totalEvents: filtered.length,
      byCategory, failureRate: filtered.length > 0 ? failures / filtered.length : 0,
      deniedAccessAttempts: denied, complianceScore: anomalies.length === 0 ? 95 : 70, anomalies,
    };
  }, []);

  return { record, generateReport };
}

/**
 * InvestigationAuditManager — Records complete investigation lifecycle:
 * start → symptoms → analysis → hypotheses → governance → result.
 * Links each audit entry to its investigation session ID.
 */
import { useCallback, useRef } from "react";

export interface InvestigationAuditRecord {
  investigationId: string;
  sessionId: string;
  startTimestamp: number;
  endTimestamp?: number;
  lifecycle: InvestigationLifecycleEvent[];
  finalOutcome?: "completed" | "abandoned" | "recovered" | "error";
  symptomSnapshot: string[];
  hypothesisSnapshot: { condition: string; confidence: number }[];
  governanceVerdict?: "passed" | "moderated" | "blocked";
  escalationFinal?: string;
  durationMs?: number;
}

export interface InvestigationLifecycleEvent {
  phase: "started" | "symptoms_collected" | "analysis_begun" | "hypotheses_generated" | "governance_applied" | "result_displayed" | "completed" | "abandoned" | "error";
  timestamp: number;
  detail: string;
  metadata?: Record<string, unknown>;
}

export function useInvestigationAuditManager() {
  const records = useRef<Map<string, InvestigationAuditRecord>>(new Map());

  const startInvestigationAudit = useCallback((investigationId: string, sessionId: string) => {
    const record: InvestigationAuditRecord = {
      investigationId,
      sessionId,
      startTimestamp: Date.now(),
      lifecycle: [{ phase: "started", timestamp: Date.now(), detail: "Investigation initiated" }],
      symptomSnapshot: [],
      hypothesisSnapshot: [],
    };
    records.current.set(investigationId, record);
    return record;
  }, []);

  const recordEvent = useCallback((investigationId: string, event: InvestigationLifecycleEvent) => {
    const record = records.current.get(investigationId);
    if (record) {
      record.lifecycle.push(event);
    }
  }, []);

  const recordSymptoms = useCallback((investigationId: string, symptoms: string[]) => {
    const record = records.current.get(investigationId);
    if (record) {
      record.symptomSnapshot = [...symptoms];
      record.lifecycle.push({ phase: "symptoms_collected", timestamp: Date.now(), detail: `${symptoms.length} symptoms recorded` });
    }
  }, []);

  const recordHypotheses = useCallback((investigationId: string, hypotheses: { condition: string; confidence: number }[]) => {
    const record = records.current.get(investigationId);
    if (record) {
      record.hypothesisSnapshot = [...hypotheses];
      record.lifecycle.push({
        phase: "hypotheses_generated",
        timestamp: Date.now(),
        detail: `${hypotheses.length} hypotheses generated. Primary: ${hypotheses[0]?.condition || "none"} (${hypotheses[0]?.confidence?.toFixed(0) || 0}%)`,
      });
    }
  }, []);

  const recordGovernance = useCallback((investigationId: string, verdict: "passed" | "moderated" | "blocked", escalation: string) => {
    const record = records.current.get(investigationId);
    if (record) {
      record.governanceVerdict = verdict;
      record.escalationFinal = escalation;
      record.lifecycle.push({
        phase: "governance_applied",
        timestamp: Date.now(),
        detail: `Governance verdict: ${verdict} | Escalation: ${escalation}`,
      });
    }
  }, []);

  const completeAudit = useCallback((investigationId: string, outcome: InvestigationAuditRecord["finalOutcome"] = "completed") => {
    const record = records.current.get(investigationId);
    if (record) {
      record.endTimestamp = Date.now();
      record.finalOutcome = outcome;
      record.durationMs = record.endTimestamp - record.startTimestamp;
      record.lifecycle.push({ phase: outcome === "completed" ? "completed" : outcome === "error" ? "error" : "abandoned", timestamp: Date.now(), detail: `Investigation ${outcome}. Duration: ${(record.durationMs / 1000).toFixed(1)}s` });
    }
    return record || null;
  }, []);

  const getRecord = useCallback((investigationId: string) => records.current.get(investigationId) || null, []);

  const getAllRecords = useCallback(() => Array.from(records.current.values()), []);

  return { startInvestigationAudit, recordEvent, recordSymptoms, recordHypotheses, recordGovernance, completeAudit, getRecord, getAllRecords };
}

/**
 * DecisionTraceRecorder — Persistent, governance-aware decision tracing.
 * Records decision lineage: what triggered it, what evidence supported it,
 * what alternatives existed. Supports "why did the AI decide X?" queries.
 */
import { useCallback, useRef } from "react";

export interface DecisionTrace {
  id: string;
  timestamp: number;
  sessionId: string;
  investigationId: string;
  category: string;
  decision: string;
  trigger: string;
  supportingEvidence: string[];
  alternativesConsidered: string[];
  confidenceBasis: number;
  wasModerated: boolean;
  moderationReason?: string;
  lineageParentId?: string;  // Links to the decision that led to this one
}

export interface DecisionLineage {
  rootDecision: DecisionTrace;
  chain: DecisionTrace[];
  depth: number;
  narrative: string;
}

export function useDecisionTraceRecorder() {
  const tracesRef = useRef<DecisionTrace[]>([]);

  const record = useCallback((trace: Omit<DecisionTrace, "id" | "timestamp">): DecisionTrace => {
    const full: DecisionTrace = {
      ...trace,
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    tracesRef.current.push(full);
    if (tracesRef.current.length > 300) tracesRef.current = tracesRef.current.slice(-200);
    return full;
  }, []);

  const getLineage = useCallback((traceId: string): DecisionLineage | null => {
    const target = tracesRef.current.find(t => t.id === traceId);
    if (!target) return null;

    const chain: DecisionTrace[] = [target];
    let current = target;

    // Walk up the lineage chain
    while (current.lineageParentId) {
      const parent = tracesRef.current.find(t => t.id === current.lineageParentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    // Build narrative
    const narrative = chain.map((t, i) => {
      const prefix = i === 0 ? "Initially" : i === chain.length - 1 ? "Finally" : "Then";
      return `${prefix}: ${t.decision} (triggered by: ${t.trigger})`;
    }).join(" → ");

    return {
      rootDecision: chain[0],
      chain,
      depth: chain.length,
      narrative,
    };
  }, []);

  const queryBySession = useCallback((sessionId: string) =>
    tracesRef.current.filter(t => t.sessionId === sessionId), []);

  const queryByCategory = useCallback((category: string) =>
    tracesRef.current.filter(t => t.category === category), []);

  const getModeratedDecisions = useCallback(() =>
    tracesRef.current.filter(t => t.wasModerated), []);

  const explainDecision = useCallback((traceId: string): string => {
    const lineage = getLineage(traceId);
    if (!lineage) return "Decision trace not found.";

    const target = lineage.chain[lineage.chain.length - 1];
    const parts: string[] = [];

    parts.push(`Decision: ${target.decision}`);
    parts.push(`Triggered by: ${target.trigger}`);

    if (target.supportingEvidence.length > 0) {
      parts.push(`Supported by: ${target.supportingEvidence.join(", ")}`);
    }
    if (target.alternativesConsidered.length > 0) {
      parts.push(`Alternatives considered: ${target.alternativesConsidered.join(", ")}`);
    }
    if (target.wasModerated) {
      parts.push(`Moderated: ${target.moderationReason || "governance safety check"}`);
    }
    if (lineage.depth > 1) {
      parts.push(`Decision lineage: ${lineage.depth} steps`);
    }

    return parts.join(". ") + ".";
  }, [getLineage]);

  return { record, getLineage, queryBySession, queryByCategory, getModeratedDecisions, explainDecision };
}

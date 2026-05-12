/**
 * InvestigationDecisionLogger — Records every clinical decision made
 * during an investigation with its reasoning, so the user can understand
 * "why" the AI made each choice. Supports progressive disclosure.
 */
import { useCallback, useRef } from "react";

export type DecisionCategory =
  | "hypothesis_change"
  | "escalation_change"
  | "confidence_moderation"
  | "wearable_moderation"
  | "uncertainty_acknowledgement"
  | "pacing_adjustment"
  | "recovery_assessment"
  | "contradiction_resolution"
  | "edge_case_handling";

export interface ClinicalDecision {
  id: string;
  category: DecisionCategory;
  summary: string;            // Brief user-friendly summary
  detail: string;             // Expanded explanation for advanced users
  impact: "low" | "medium" | "high";
  timestamp: number;
  relatedCondition?: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface DecisionLog {
  decisions: ClinicalDecision[];
  totalDecisions: number;
  significantDecisions: number;
  summaryNarrative: string;
}

export function useDecisionLogger() {
  const logRef = useRef<ClinicalDecision[]>([]);

  const logDecision = useCallback((
    category: DecisionCategory,
    summary: string,
    detail: string,
    impact: ClinicalDecision["impact"] = "low",
    meta?: { relatedCondition?: string; beforeValue?: string; afterValue?: string }
  ) => {
    const decision: ClinicalDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      category,
      summary,
      detail,
      impact,
      timestamp: Date.now(),
      ...meta,
    };
    logRef.current.push(decision);
    if (logRef.current.length > 200) logRef.current = logRef.current.slice(-100);
  }, []);

  const getLog = useCallback((filter?: DecisionCategory): DecisionLog => {
    const all = filter
      ? logRef.current.filter(d => d.category === filter)
      : logRef.current;

    const significant = all.filter(d => d.impact === "medium" || d.impact === "high");

    let summaryNarrative: string;
    if (all.length === 0) {
      summaryNarrative = "No clinical reasoning decisions recorded yet.";
    } else if (significant.length === 0) {
      summaryNarrative = `${all.length} routine clinical reasoning steps recorded — all within normal parameters.`;
    } else {
      const categories = [...new Set(significant.map(d => d.category))];
      const categoryLabels: Record<string, string> = {
        hypothesis_change: "hypothesis adjustments",
        escalation_change: "escalation moderations",
        confidence_moderation: "confidence refinements",
        wearable_moderation: "wearable interpretations",
        uncertainty_acknowledgement: "uncertainty recognitions",
        pacing_adjustment: "pacing adjustments",
        recovery_assessment: "recovery validations",
        contradiction_resolution: "contradiction resolutions",
        edge_case_handling: "edge-case handlings",
      };
      const labels = categories.map(c => categoryLabels[c] || c).join(", ");
      summaryNarrative = `${significant.length} significant decision${significant.length > 1 ? "s" : ""} recorded, including: ${labels}.`;
    }

    return {
      decisions: [...all],
      totalDecisions: all.length,
      significantDecisions: significant.length,
      summaryNarrative,
    };
  }, []);

  const getRecentSignificant = useCallback((count: number = 5): ClinicalDecision[] => {
    return logRef.current
      .filter(d => d.impact === "medium" || d.impact === "high")
      .slice(-count)
      .reverse();
  }, []);

  const reset = useCallback(() => {
    logRef.current = [];
  }, []);

  return { logDecision, getLog, getRecentSignificant, reset };
}

/**
 * InvestigationCoherenceMonitor — Ensures a single investigation remains
 * internally consistent: symptoms match hypotheses, evidence aligns with
 * escalation, and no contradictory conclusions are silently accepted.
 */
import { useCallback, useRef } from "react";

export interface CoherenceIssue {
  type: "symptom_hypothesis_mismatch" | "evidence_escalation_mismatch" | "confidence_evidence_mismatch" | "narrative_contradiction";
  severity: "info" | "warning" | "critical";
  description: string;
  suggestedAction: string;
  timestamp: number;
}

export interface CoherenceReport {
  isCoherent: boolean;
  overallScore: number; // 0-100
  issues: CoherenceIssue[];
  narrative: string;
}

export function useInvestigationCoherence() {
  const issueHistoryRef = useRef<CoherenceIssue[]>([]);

  const evaluateCoherence = useCallback((
    activeSymptoms: string[],
    hypotheses: { condition: string; confidence: number }[],
    escalationLevel: string,
    evidenceStrength: string,
    governedConfidence: number,
  ): CoherenceReport => {
    const issues: CoherenceIssue[] = [];

    // 1. High confidence + weak evidence = suspicious
    if (governedConfidence > 75 && (evidenceStrength === "weak" || evidenceStrength === "Weak")) {
      issues.push({
        type: "confidence_evidence_mismatch",
        severity: "warning",
        description: `Confidence is ${governedConfidence}% but evidence strength is rated as weak.`,
        suggestedAction: "Moderate confidence display or request additional evidence.",
        timestamp: Date.now(),
      });
    }

    // 2. Emergency escalation + low confidence = inconsistent
    if ((escalationLevel === "emergency" || escalationLevel === "urgent") && governedConfidence < 40) {
      issues.push({
        type: "evidence_escalation_mismatch",
        severity: "critical",
        description: `Escalation is at "${escalationLevel}" but confidence is only ${governedConfidence}%.`,
        suggestedAction: "Either lower escalation or justify with specific critical triggers.",
        timestamp: Date.now(),
      });
    }

    // 3. No symptoms + hypotheses present = odd
    if (activeSymptoms.length === 0 && hypotheses.length > 0) {
      issues.push({
        type: "symptom_hypothesis_mismatch",
        severity: "warning",
        description: "Hypotheses are present but no active symptoms recorded.",
        suggestedAction: "Verify that symptoms were properly captured.",
        timestamp: Date.now(),
      });
    }

    // 4. Too many high-confidence hypotheses (>3 above 60%) = may confuse
    const highConfCount = hypotheses.filter(h => h.confidence > 60).length;
    if (highConfCount > 3) {
      issues.push({
        type: "narrative_contradiction",
        severity: "info",
        description: `${highConfCount} hypotheses have confidence above 60%, which may reduce clinical clarity.`,
        suggestedAction: "Consider differentiating more clearly between primary and secondary considerations.",
        timestamp: Date.now(),
      });
    }

    // 5. Very few symptoms + many hypotheses = over-inference
    if (activeSymptoms.length <= 2 && hypotheses.length >= 5) {
      issues.push({
        type: "symptom_hypothesis_mismatch",
        severity: "warning",
        description: `Only ${activeSymptoms.length} symptom(s) but ${hypotheses.length} hypotheses generated — this may represent over-inference.`,
        suggestedAction: "Reduce hypothesis count or explicitly mark additional hypotheses as speculative.",
        timestamp: Date.now(),
      });
    }

    // Store issues
    issueHistoryRef.current.push(...issues);
    if (issueHistoryRef.current.length > 100) {
      issueHistoryRef.current = issueHistoryRef.current.slice(-50);
    }

    const score = Math.max(0, 100 - issues.reduce((penalty, issue) => {
      if (issue.severity === "critical") return penalty + 25;
      if (issue.severity === "warning") return penalty + 10;
      return penalty + 3;
    }, 0));

    let narrative: string;
    if (score >= 90) narrative = "Investigation reasoning is internally consistent.";
    else if (score >= 70) narrative = "Minor coherence observations noted — reasoning is largely sound.";
    else if (score >= 50) narrative = "Some coherence gaps detected — reasoning may benefit from additional evidence.";
    else narrative = "Significant coherence issues detected — reasoning stability requires attention.";

    return {
      isCoherent: score >= 70,
      overallScore: score,
      issues,
      narrative,
    };
  }, []);

  const getIssueHistory = useCallback(() => [...issueHistoryRef.current], []);

  const reset = useCallback(() => {
    issueHistoryRef.current = [];
  }, []);

  return { evaluateCoherence, getIssueHistory, reset };
}

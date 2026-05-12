/**
 * GovernanceReasoningGuard — Master guard validating ALL reasoning outputs
 * pass governance thresholds before display. Produces a GuardVerdict with
 * pass/fail and remediation actions.
 */
import { useCallback } from "react";
import {
  CONFIDENCE_THRESHOLDS,
  ESCALATION_THRESHOLDS,
  REASONING_THRESHOLDS,
  WEARABLE_THRESHOLDS,
} from "./ClinicalSafetyThresholds";

export interface GuardVerdict {
  passed: boolean;
  checks: GuardCheck[];
  remediations: string[];
  modifiedOutput: {
    hypotheses?: { condition: string; confidence: number }[];
    escalation?: string;
    disclaimers: string[];
  };
}

export interface GuardCheck {
  name: string;
  passed: boolean;
  reason: string;
  severity: "info" | "warning" | "block";
}

export function useGovernanceReasoningGuard() {
  const evaluate = useCallback((input: {
    hypotheses: { condition: string; confidence: number }[];
    escalation: string;
    evidenceScore: number;
    stabilityScore: number;
    wearableReliability: number;
    warningCount: number;
    symptomCount: number;
    conversationTurns: number;
  }): GuardVerdict => {
    const checks: GuardCheck[] = [];
    const remediations: string[] = [];
    const disclaimers: string[] = [];
    let modifiedHypotheses = [...input.hypotheses];
    let modifiedEscalation = input.escalation;

    // ── 1. Confidence Boundary Check ──────
    const primary = input.hypotheses[0];
    if (primary && primary.confidence > CONFIDENCE_THRESHOLDS.MAX_DISPLAY_CONFIDENCE) {
      checks.push({
        name: "confidence_boundary",
        passed: false,
        reason: `Primary confidence ${primary.confidence.toFixed(0)}% exceeds max ${CONFIDENCE_THRESHOLDS.MAX_DISPLAY_CONFIDENCE}%`,
        severity: "warning",
      });
      modifiedHypotheses = modifiedHypotheses.map((h, i) => i === 0
        ? { ...h, confidence: Math.min(h.confidence, CONFIDENCE_THRESHOLDS.MAX_DISPLAY_CONFIDENCE) }
        : h
      );
      remediations.push("Confidence capped to governance maximum");
      disclaimers.push("Confidence levels are moderated by clinical governance for safety.");
    } else {
      checks.push({ name: "confidence_boundary", passed: true, reason: "Within acceptable range", severity: "info" });
    }

    // ── 2. Low Evidence + High Confidence ─
    if (input.evidenceScore < CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE_MIN_EVIDENCE && primary && primary.confidence > 70) {
      checks.push({
        name: "evidence_confidence_mismatch",
        passed: false,
        reason: `High confidence (${primary.confidence.toFixed(0)}%) with low evidence (${input.evidenceScore})`,
        severity: "warning",
      });
      modifiedHypotheses = modifiedHypotheses.map((h, i) => i === 0
        ? { ...h, confidence: Math.min(h.confidence, CONFIDENCE_THRESHOLDS.LOW_EVIDENCE_CONFIDENCE_CAP) }
        : h
      );
      remediations.push("Confidence reduced due to insufficient evidence");
    } else {
      checks.push({ name: "evidence_confidence_mismatch", passed: true, reason: "Evidence supports confidence level", severity: "info" });
    }

    // ── 3. Minimum Symptom Check ──────────
    if (input.symptomCount < CONFIDENCE_THRESHOLDS.MIN_SYMPTOMS_FOR_MODERATE_CONFIDENCE && primary && primary.confidence > 50) {
      checks.push({
        name: "sparse_symptom_confidence",
        passed: false,
        reason: `Only ${input.symptomCount} symptom(s) reported for ${primary.confidence.toFixed(0)}% confidence`,
        severity: "warning",
      });
      disclaimers.push("This assessment is based on limited symptom information.");
    } else {
      checks.push({ name: "sparse_symptom_confidence", passed: true, reason: "Sufficient symptoms for confidence level", severity: "info" });
    }

    // ── 4. Escalation Safety ──────────────
    if ((input.escalation === "critical" || input.escalation === "emergency") &&
        input.evidenceScore < ESCALATION_THRESHOLDS.CRITICAL_MIN_EVIDENCE) {
      checks.push({
        name: "escalation_evidence_check",
        passed: false,
        reason: `${input.escalation} escalation with evidence score ${input.evidenceScore} < ${ESCALATION_THRESHOLDS.CRITICAL_MIN_EVIDENCE}`,
        severity: "block",
      });
      modifiedEscalation = "elevated";
      remediations.push("Escalation downgraded — insufficient evidence for critical level");
    } else {
      checks.push({ name: "escalation_evidence_check", passed: true, reason: "Escalation level appropriate for evidence", severity: "info" });
    }

    // ── 5. Escalation Conversation Minimum ─
    if ((input.escalation === "critical" || input.escalation === "emergency") &&
        input.conversationTurns < ESCALATION_THRESHOLDS.MIN_TURNS_FOR_CRITICAL) {
      checks.push({
        name: "escalation_conversation_check",
        passed: false,
        reason: `Critical escalation after only ${input.conversationTurns} turns (min: ${ESCALATION_THRESHOLDS.MIN_TURNS_FOR_CRITICAL})`,
        severity: "warning",
      });
      modifiedEscalation = "elevated";
      remediations.push("Escalation moderated — more information needed before critical assessment");
    } else {
      checks.push({ name: "escalation_conversation_check", passed: true, reason: "Sufficient conversation for escalation level", severity: "info" });
    }

    // ── 6. Reasoning Stability ────────────
    if (input.stabilityScore < REASONING_THRESHOLDS.MIN_STABILITY_SCORE) {
      checks.push({
        name: "reasoning_stability",
        passed: false,
        reason: `Stability score ${input.stabilityScore} below minimum ${REASONING_THRESHOLDS.MIN_STABILITY_SCORE}`,
        severity: "warning",
      });
      disclaimers.push("Our analysis is still being refined as we review the available evidence.");
    } else {
      checks.push({ name: "reasoning_stability", passed: true, reason: "Reasoning is sufficiently stable", severity: "info" });
    }

    // ── 7. Wearable Reliability ───────────
    if (input.wearableReliability < WEARABLE_THRESHOLDS.LOW_RELIABILITY_THRESHOLD && input.wearableReliability > 0) {
      checks.push({
        name: "wearable_reliability",
        passed: false,
        reason: `Wearable reliability ${input.wearableReliability} below threshold ${WEARABLE_THRESHOLDS.LOW_RELIABILITY_THRESHOLD}`,
        severity: "info",
      });
      disclaimers.push("Wearable data quality is reduced — analysis relies primarily on your reported symptoms.");
    } else {
      checks.push({ name: "wearable_reliability", passed: true, reason: "Wearable data is reliable", severity: "info" });
    }

    // ── 8. Warning Accumulation ───────────
    if (input.warningCount > REASONING_THRESHOLDS.MAX_WARNINGS_BEFORE_FLAG) {
      checks.push({
        name: "warning_accumulation",
        passed: false,
        reason: `${input.warningCount} warnings exceed threshold of ${REASONING_THRESHOLDS.MAX_WARNINGS_BEFORE_FLAG}`,
        severity: "warning",
      });
      disclaimers.push("Multiple analysis considerations were noted — results should be interpreted with additional caution.");
    } else {
      checks.push({ name: "warning_accumulation", passed: true, reason: "Warning count within acceptable range", severity: "info" });
    }

    // Always add base disclaimer
    disclaimers.push("This is an AI-assisted health analysis and should not replace professional medical advice.");

    const hasBlocks = checks.some(c => c.severity === "block" && !c.passed);
    const passed = !hasBlocks;

    return {
      passed,
      checks,
      remediations,
      modifiedOutput: {
        hypotheses: modifiedHypotheses,
        escalation: modifiedEscalation,
        disclaimers,
      },
    };
  }, []);

  return { evaluate };
}

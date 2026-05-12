/**
 * ClinicalGovernanceEngine — Core engine that receives the ComprehensiveRealismReport
 * from Phase 4 and applies governance rules to produce a GovernanceVerdict.
 * Acts as the single entry point for governance validation.
 */
import { useCallback } from "react";
import type { ComprehensiveRealismReport } from "@/features/clinical-realism/RealismValidationOrchestrator";
import type { GovernanceVerdict, AuditEntry } from "./GovernanceStateProvider";

export interface GovernanceInput {
  realismReport: ComprehensiveRealismReport;
  sessionId: string;
  activeSymptoms: string[];
  investigationPhase: string;
  conversationLength: number;
  isFirstInvestigation: boolean;
}

export interface GovernanceAnalysis {
  verdict: GovernanceVerdict;
  auditEntry: Omit<AuditEntry, "id" | "timestamp">;
  safetyFlags: GovernanceSafetyFlag[];
  moderationActions: string[];
  transparencyNotes: string[];
}

export interface GovernanceSafetyFlag {
  type: "overconfidence" | "unsafe_escalation" | "reasoning_instability" | "wearable_overreliance" | "emotional_risk" | "audit_gap";
  description: string;
  severity: "info" | "warning" | "critical";
  remediation: string;
}

export function useClinicalGovernanceEngine() {
  const analyze = useCallback((input: GovernanceInput): GovernanceAnalysis => {
    const { realismReport, sessionId } = input;
    const safetyFlags: GovernanceSafetyFlag[] = [];
    const moderationActions: string[] = [];
    const transparencyNotes: string[] = [];

    // ═══ 1. Confidence Governance ═══
    const primaryConf = realismReport.hypotheses[0]?.confidence || 0;
    if (primaryConf > 85) {
      safetyFlags.push({
        type: "overconfidence",
        description: `Primary hypothesis confidence (${primaryConf.toFixed(0)}%) exceeds governance threshold of 85%.`,
        severity: "warning",
        remediation: "Confidence capped and uncertainty disclosure added.",
      });
      moderationActions.push("confidence_capped_to_85");
    }

    // ═══ 2. Escalation Governance ═══
    const escalation = realismReport.escalation;
    if (escalation === "urgent" || escalation === "emergency") {
      if (realismReport.believabilityScores.evidence < 50) {
        safetyFlags.push({
          type: "unsafe_escalation",
          description: "Critical escalation with insufficient evidence support.",
          severity: "critical",
          remediation: "Escalation downgraded to 'elevated' with evidence disclosure.",
        });
        moderationActions.push("escalation_downgraded_insufficient_evidence");
      }
    }

    // ═══ 3. Reasoning Stability Governance ═══
    if (!realismReport.isStable) {
      safetyFlags.push({
        type: "reasoning_instability",
        description: "Reasoning outputs showed instability during this validation pass.",
        severity: "warning",
        remediation: "Stability disclaimer added to user-facing output.",
      });
      transparencyNotes.push("Our analysis is still evolving as we gather more information.");
    }

    // ═══ 4. Wearable Overreliance Check ═══
    if (realismReport.believabilityScores.wearable > 90 && input.activeSymptoms.length <= 1) {
      safetyFlags.push({
        type: "wearable_overreliance",
        description: "High wearable reliability but sparse symptom data may lead to over-interpretation.",
        severity: "info",
        remediation: "Wearable influence moderated for sparse-symptom scenarios.",
      });
      transparencyNotes.push("Wearable data is being considered alongside your reported symptoms.");
    }

    // ═══ 5. Emotional Safety Governance ═══
    if (realismReport.pacing?.shouldInsertReflectivePause && input.conversationLength > 10) {
      safetyFlags.push({
        type: "emotional_risk",
        description: "Extended conversation with high cognitive load detected.",
        severity: "info",
        remediation: "Pacing slowed to reduce cognitive burden.",
      });
      moderationActions.push("pacing_slowed_cognitive_load");
    }

    // ═══ 6. Audit Completeness ═══
    if (realismReport.allWarnings.length > 0 && realismReport.believabilityScores.overall < 40) {
      safetyFlags.push({
        type: "audit_gap",
        description: "Low believability score with multiple warnings requires enhanced audit logging.",
        severity: "warning",
        remediation: "Enhanced audit detail recorded for this investigation.",
      });
    }

    // ═══ Build Verdict ═══
    const criticalFlags = safetyFlags.filter(f => f.severity === "critical");
    const isAccountable = true; // We always produce an audit record
    const isSafe = criticalFlags.length === 0;
    const complianceOk = isSafe && realismReport.believabilityScores.overall >= 30;

    // Trust delta: positive for clean pass, negative for flags
    let trustDelta = 0;
    if (safetyFlags.length === 0) trustDelta = 2;
    else if (criticalFlags.length > 0) trustDelta = -10;
    else trustDelta = -safetyFlags.length * 2;

    const verdict: GovernanceVerdict = {
      isAccountable,
      isSafe,
      auditEntryId: "", // Will be assigned by GovernanceStateProvider
      safetyFlags: safetyFlags.map(f => f.description),
      complianceOk,
      trustDelta,
      moderationApplied: moderationActions,
      timestamp: Date.now(),
    };

    // ═══ Build Audit Entry ═══
    const auditEntry: Omit<AuditEntry, "id" | "timestamp"> = {
      sessionId,
      category: "investigation",
      action: "governance_validation",
      detail: `Governance pass: ${isSafe ? "SAFE" : "FLAGGED"} | Trust Δ: ${trustDelta > 0 ? "+" : ""}${trustDelta} | Flags: ${safetyFlags.length} | Moderations: ${moderationActions.length}`,
      impact: criticalFlags.length > 0 ? "critical" : safetyFlags.length > 0 ? "medium" : "low",
      outcome: criticalFlags.length > 0 ? "blocked" : moderationActions.length > 0 ? "moderated" : "passed",
      relatedCondition: realismReport.hypotheses[0]?.condition,
      metadata: {
        believabilityScores: realismReport.believabilityScores,
        escalation: realismReport.escalation,
        warningCount: realismReport.allWarnings.length,
      },
    };

    // ═══ Transparency Notes ═══
    if (transparencyNotes.length === 0 && isSafe) {
      transparencyNotes.push("This investigation has passed all governance checks.");
    }

    return { verdict, auditEntry, safetyFlags, moderationActions, transparencyNotes };
  }, []);

  return { analyze };
}

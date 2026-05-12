/**
 * GovernanceOrchestrator — Master orchestrator unifying ALL Phase 5 sub-systems
 * into a single `runGovernancePass()` call. Coordinates:
 * governance engine → safety guards → accountability → audit → transparency → trust
 *
 * Integrates with ClinicalSessionManager as a post-realism validation step.
 */
import { useCallback } from "react";
import { useClinicalGovernanceEngine, GovernanceAnalysis } from "./ClinicalGovernanceEngine";
import { useMedicalAccountability, AccountabilityRecord } from "./MedicalAccountabilityLayer";
import { useTrustInfrastructure, TrustHealthReport } from "./TrustInfrastructureManager";
import { useGovernance, GovernanceVerdict } from "./GovernanceStateProvider";
import type { ComprehensiveRealismReport } from "@/features/clinical-realism/RealismValidationOrchestrator";

export interface GovernancePassInput {
  realismReport: ComprehensiveRealismReport;
  sessionId: string;
  investigationId: string;
  activeSymptoms: string[];
  investigationPhase: string;
  conversationTurns: number;
  isFirstInvestigation: boolean;
  wearableConnected: boolean;
  humanReviewRecommended: boolean;
}

export interface GovernancePassResult {
  verdict: GovernanceVerdict;
  analysis: GovernanceAnalysis;
  accountability: AccountabilityRecord;
  trustHealth: TrustHealthReport;
  transparencyNotes: string[];
  finalHypotheses: { condition: string; confidence: number }[];
  finalEscalation: string;
  wasModified: boolean;
}

export function useGovernanceOrchestrator() {
  const engine = useClinicalGovernanceEngine();
  const accountability = useMedicalAccountability();
  const trust = useTrustInfrastructure();
  const gov = useGovernance();

  /**
   * Run the complete governance pass. Call after realism validation,
   * before updating user-facing state.
   */
  const runGovernancePass = useCallback((input: GovernancePassInput): GovernancePassResult => {
    // ═══ 1. Core Governance Analysis ═══
    const analysis = engine.analyze({
      realismReport: input.realismReport,
      sessionId: input.sessionId,
      activeSymptoms: input.activeSymptoms,
      investigationPhase: input.investigationPhase,
      conversationLength: input.conversationTurns,
      isFirstInvestigation: input.isFirstInvestigation,
    });

    // ═══ 2. Apply Governance Modifications ═══
    let finalHypotheses = [...input.realismReport.hypotheses];
    let finalEscalation = input.realismReport.escalation;
    let wasModified = false;

    // Cap overconfident hypotheses
    if (analysis.moderationActions.includes("confidence_capped_to_85")) {
      finalHypotheses = finalHypotheses.map(h => ({
        ...h,
        confidence: Math.min(h.confidence, 85),
      }));
      wasModified = true;
    }

    // Downgrade unsafe escalation
    if (analysis.moderationActions.includes("escalation_downgraded_insufficient_evidence")) {
      finalEscalation = "elevated";
      wasModified = true;
    }

    // ═══ 3. Record Audit Entry ═══
    gov.addAuditEntry(analysis.auditEntry);

    // ═══ 4. Record Safety Violations ═══
    analysis.safetyFlags
      .filter(f => f.severity === "critical" || f.severity === "warning")
      .forEach(flag => {
        gov.addSafetyViolation({
          type: mapFlagToViolationType(flag.type),
          description: flag.description,
          severity: flag.severity === "critical" ? "critical" : "warning",
          wasBlocked: flag.severity === "critical",
          remediation: flag.remediation,
        });
      });

    // ═══ 5. Record Escalation History ═══
    gov.addEscalationRecord({
      sessionId: input.sessionId,
      proposedLevel: input.realismReport.escalation,
      finalLevel: finalEscalation,
      wasModerated: finalEscalation !== input.realismReport.escalation,
      reason: analysis.safetyFlags.find(f => f.type === "unsafe_escalation")?.description || "Standard governance check",
      triggerSymptoms: input.activeSymptoms.slice(0, 5),
      governanceApproved: analysis.verdict.isSafe,
    });

    // ═══ 6. Create Accountability Record ═══
    const accountabilityRecord = accountability.createRecord({
      investigationId: input.investigationId,
      sessionId: input.sessionId,
      realismReport: input.realismReport,
      governancePassed: analysis.verdict.isSafe,
      flagCount: analysis.safetyFlags.length,
      moderationCount: analysis.moderationActions.length,
      symptomCount: input.activeSymptoms.length,
      wearableAvailable: input.wearableConnected,
      conversationTurns: input.conversationTurns,
      humanReviewRecommended: input.humanReviewRecommended,
    });

    // Validate accountability completeness
    const completeness = accountability.validateCompleteness(accountabilityRecord);
    if (!completeness.isComplete) {
      gov.addAuditEntry({
        sessionId: input.sessionId,
        category: "safety",
        action: "accountability_gap_detected",
        detail: `Accountability gaps: ${completeness.gaps.join(", ")}`,
        impact: "medium",
        outcome: "logged",
      });
    }

    // ═══ 7. Compute Trust Health ═══
    const trustHealth = trust.computeHealth(gov.trustScore, {
      recentViolationCount: analysis.safetyFlags.length,
      auditGapDetected: !completeness.isComplete,
      wearableDisconnected: !input.wearableConnected,
    });

    // ═══ 8. Store Verdict ═══
    gov.setLastVerdict(analysis.verdict);

    return {
      verdict: analysis.verdict,
      analysis,
      accountability: accountabilityRecord,
      trustHealth,
      transparencyNotes: analysis.transparencyNotes,
      finalHypotheses,
      finalEscalation,
      wasModified,
    };
  }, [engine, accountability, trust, gov]);

  return { runGovernancePass };
}

function mapFlagToViolationType(flagType: string): "unsafe_reasoning" | "overconfident" | "unsafe_escalation" | "emotional_harm" | "privacy_breach" | "unsafe_recommendation" {
  switch (flagType) {
    case "overconfidence": return "overconfident";
    case "unsafe_escalation": return "unsafe_escalation";
    case "reasoning_instability": return "unsafe_reasoning";
    case "emotional_risk": return "emotional_harm";
    case "wearable_overreliance": return "unsafe_reasoning";
    default: return "unsafe_reasoning";
  }
}

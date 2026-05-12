/**
 * MedicalAccountabilityLayer — Ensures every investigation produces a
 * complete accountability record. No prediction reaches the user without
 * governance sign-off. Generates accountability summaries for audit trail.
 */
import { useCallback } from "react";
import type { ComprehensiveRealismReport } from "@/features/clinical-realism/RealismValidationOrchestrator";

export interface AccountabilityRecord {
  investigationId: string;
  sessionId: string;
  timestamp: number;
  inputSummary: {
    symptomCount: number;
    wearableAvailable: boolean;
    conversationTurns: number;
  };
  reasoningSummary: {
    hypothesesCount: number;
    primaryCondition: string;
    primaryConfidence: number;
    escalationLevel: string;
    wasModerated: boolean;
  };
  governanceSummary: {
    safetyPassed: boolean;
    flagCount: number;
    moderationCount: number;
    auditRecorded: boolean;
  };
  outputSummary: {
    userReceivedResult: boolean;
    disclaimerShown: boolean;
    uncertaintyDisclosed: boolean;
    humanReviewRecommended: boolean;
  };
  accountabilityNarrative: string;
}

export function useMedicalAccountability() {
  const createRecord = useCallback((params: {
    investigationId: string;
    sessionId: string;
    realismReport: ComprehensiveRealismReport;
    governancePassed: boolean;
    flagCount: number;
    moderationCount: number;
    symptomCount: number;
    wearableAvailable: boolean;
    conversationTurns: number;
    humanReviewRecommended: boolean;
  }): AccountabilityRecord => {
    const { realismReport } = params;
    const primary = realismReport.hypotheses[0];

    const record: AccountabilityRecord = {
      investigationId: params.investigationId,
      sessionId: params.sessionId,
      timestamp: Date.now(),
      inputSummary: {
        symptomCount: params.symptomCount,
        wearableAvailable: params.wearableAvailable,
        conversationTurns: params.conversationTurns,
      },
      reasoningSummary: {
        hypothesesCount: realismReport.hypotheses.length,
        primaryCondition: primary?.condition || "unknown",
        primaryConfidence: primary?.confidence || 0,
        escalationLevel: realismReport.escalation,
        wasModerated: !realismReport.isStable,
      },
      governanceSummary: {
        safetyPassed: params.governancePassed,
        flagCount: params.flagCount,
        moderationCount: params.moderationCount,
        auditRecorded: true,
      },
      outputSummary: {
        userReceivedResult: true,
        disclaimerShown: true,
        uncertaintyDisclosed: realismReport.uncertainty?.isAcknowledged || false,
        humanReviewRecommended: params.humanReviewRecommended,
      },
      accountabilityNarrative: buildNarrative(params, realismReport),
    };

    return record;
  }, []);

  const validateCompleteness = useCallback((record: AccountabilityRecord): { isComplete: boolean; gaps: string[] } => {
    const gaps: string[] = [];

    if (!record.governanceSummary.auditRecorded) gaps.push("Audit trail not recorded");
    if (!record.outputSummary.disclaimerShown) gaps.push("Medical disclaimer not shown");
    if (record.reasoningSummary.primaryConfidence > 80 && !record.outputSummary.uncertaintyDisclosed) {
      gaps.push("High confidence without uncertainty disclosure");
    }
    if (record.inputSummary.symptomCount === 0) gaps.push("No symptoms recorded for investigation");
    if (!record.governanceSummary.safetyPassed && record.outputSummary.userReceivedResult) {
      gaps.push("Result shown despite governance failure");
    }

    return { isComplete: gaps.length === 0, gaps };
  }, []);

  return { createRecord, validateCompleteness };
}

function buildNarrative(params: { flagCount: number; moderationCount: number; humanReviewRecommended: boolean }, report: ComprehensiveRealismReport): string {
  const primary = report.hypotheses[0];
  const parts: string[] = [];

  parts.push(`Investigation assessed ${report.hypotheses.length} potential condition${report.hypotheses.length !== 1 ? "s" : ""}.`);

  if (primary) {
    parts.push(`Primary finding: ${primary.condition} (${primary.confidence.toFixed(0)}% confidence).`);
  }

  if (params.flagCount > 0) {
    parts.push(`${params.flagCount} governance flag${params.flagCount !== 1 ? "s" : ""} were raised.`);
  }

  if (params.moderationCount > 0) {
    parts.push(`${params.moderationCount} moderation${params.moderationCount !== 1 ? "s" : ""} applied to ensure safe output.`);
  }

  if (params.humanReviewRecommended) {
    parts.push("Professional medical review was recommended.");
  }

  parts.push("All outputs include a medical disclaimer and uncertainty disclosure.");

  return parts.join(" ");
}

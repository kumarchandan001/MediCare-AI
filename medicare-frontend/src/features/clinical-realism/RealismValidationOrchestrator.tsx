/**
 * RealismValidationOrchestrator — The unified orchestration layer for
 * Phase 4 Clinical Realism. Coordinates ALL sub-engines into one
 * coherent validation pass that produces a comprehensive realism report.
 *
 * This replaces the simpler ClinicalRealismEngine as the primary entry
 * point for the clinical session pipeline.
 */
import { useCallback } from "react";
import { useReasoningConsistency } from "./ReasoningConsistencyTracker";
import { useEscalationRealism, EscalationLevel } from "./EscalationRealismLayer";
import { useTemporalConsistency } from "./TemporalConsistencyEngine";
import { useWearableReliability } from "./WearableReliabilityEngine";
import { useEdgeCaseReasoning } from "./EdgeCaseReasoningEngine";
import { useDecisionStability } from "./DecisionStabilityEngine";
import { useConfidenceStability, StabilityAnalysis } from "./ConfidenceStabilityAnalyzer";
import { useHypothesisEvolution, EvolutionReport } from "./HypothesisEvolutionModerator";
import { useInvestigationCoherence, CoherenceReport } from "./InvestigationCoherenceMonitor";
import { useSeverityEvolution, SeverityEvolutionReport } from "./SeverityEvolutionValidator";
import { useUncertaintyRealism, UncertaintyProfile } from "./UncertaintyRealismEngine";
import { useLongitudinalCoherence, LongitudinalCoherenceReport } from "./LongitudinalCoherenceValidator";
import { useNarrativeContinuity, ContinuityReport } from "./NarrativeContinuityManager";
import { useDecisionLogger } from "./InvestigationDecisionLogger";
import { useClinicalPacing, PacingState } from "./ClinicalPacingController";

export interface ComprehensiveRealismReport {
  // Core outputs
  hypotheses: { condition: string; confidence: number }[];
  escalation: EscalationLevel;
  calmEscalationMessage: string;
  severity: SeverityEvolutionReport;

  // Stability & believability
  isStable: boolean;
  confidenceStability: StabilityAnalysis;
  hypothesisEvolution: EvolutionReport;
  coherence: CoherenceReport;
  longitudinalCoherence: LongitudinalCoherenceReport;

  // Uncertainty & transparency
  uncertainty: UncertaintyProfile;
  narrativeContinuity: ContinuityReport;

  // Wearable & edge cases
  wearablePenaltyApplied: boolean;
  edgeCaseDisclosure?: string;

  // Pacing
  pacing: PacingState;

  // Aggregate scores for UI
  believabilityScores: {
    reasoning: number;
    evidence: number;
    temporal: number;
    wearable: number;
    overall: number;
  };

  // Warnings collected from all engines
  allWarnings: string[];
}

export function useRealismOrchestrator() {
  const consistency = useReasoningConsistency();
  const escalationEngine = useEscalationRealism();
  const temporal = useTemporalConsistency();
  const wearable = useWearableReliability();
  const edgeCase = useEdgeCaseReasoning();
  const stability = useDecisionStability();
  const confStability = useConfidenceStability();
  const evolution = useHypothesisEvolution();
  const coherence = useInvestigationCoherence();
  const severityValidator = useSeverityEvolution();
  const uncertaintyEngine = useUncertaintyRealism();
  const longitudinal = useLongitudinalCoherence();
  const narrative = useNarrativeContinuity();
  const decisionLogger = useDecisionLogger();
  const pacing = useClinicalPacing();

  /**
   * Run a full realism validation pass. Call this after receiving
   * raw backend data and BEFORE updating the InvestigationStateProvider.
   */
  const validateFull = useCallback((input: {
    rawHypotheses: { condition: string; confidence: number }[];
    rawEscalation: EscalationLevel;
    rawSeverity: number;
    evidenceStrength: string;
    activeSymptoms: string[];
    hasCriticalTrigger: boolean;
    currentHR: number;
    currentHRV: number;
    wearableDriftDetected: boolean;
    daysUnresolved: number;
    contradictionCount: number;
    consecutiveQuestions: number;
    cognitiveLoadEstimate: number;
    isFirstInvestigation: boolean;
    userResponseSpeed: number;
  }): ComprehensiveRealismReport => {
    const allWarnings: string[] = [];

    // ═══ 1. Wearable Reliability ═══
    const wReport = wearable.assessReliability(
      input.currentHR, input.currentHRV, input.wearableDriftDetected
    );
    if (!wReport.isReliable) {
      decisionLogger.logDecision("wearable_moderation",
        "Wearable data influence reduced",
        wReport.moderationReason,
        "medium",
        { beforeValue: "100%", afterValue: `${Math.round((1 - wReport.confidencePenalty) * 100)}%` }
      );
    }

    // ═══ 2. Edge Case Detection ═══
    const eReport = edgeCase.evaluateEdgeCases(
      input.activeSymptoms, input.rawHypotheses, input.daysUnresolved
    );
    if (eReport.isEdgeCase) {
      decisionLogger.logDecision("edge_case_handling",
        `Edge case: ${eReport.edgeCaseType.replace(/_/g, " ")}`,
        eReport.disclosure,
        "medium"
      );
    }

    // ═══ 3. Apply Penalties & Caps ═══
    let adjustedHypotheses = input.rawHypotheses.map(hyp => {
      let conf = hyp.confidence;
      if (!wReport.isReliable) conf *= (1 - wReport.confidencePenalty);
      if (eReport.isEdgeCase) conf = Math.min(conf, eReport.confidenceCap);
      return { ...hyp, confidence: conf };
    });

    // ═══ 4. Reasoning Consistency (Smoothing) ═══
    const cReport = consistency.moderateHypotheses(adjustedHypotheses, input.evidenceStrength);
    const finalHypotheses = cReport.moderatedHypotheses.map(m => ({
      condition: m.condition, confidence: m.moderated,
    }));
    if (cReport.warnings.length > 0) {
      allWarnings.push(...cReport.warnings);
      cReport.warnings.forEach(w => {
        decisionLogger.logDecision("confidence_moderation", w, w, "low");
      });
    }

    // ═══ 5. Confidence Stability Analysis ═══
    const stabilityAnalyses = finalHypotheses.map(h => confStability.analyze(h.condition, h.confidence));
    const primaryStability = stabilityAnalyses[0] || {
      grade: "steady" as const, rollingVariance: 0, oscillationDetected: false,
      trendDirection: "stable" as const, confidenceFloor: 0, confidenceCeiling: 0,
      narrativeAdvice: "",
    };

    // ═══ 6. Hypothesis Evolution ═══
    const evoReport = evolution.moderateEvolution(finalHypotheses, input.evidenceStrength);
    if (evoReport.topHypothesisChanged) {
      decisionLogger.logDecision("hypothesis_change",
        "Primary hypothesis changed",
        evoReport.evolutionNarrative,
        "high"
      );
    }
    allWarnings.push(...evoReport.warnings);

    // ═══ 7. Escalation Realism ═══
    const escReport = escalationEngine.moderateEscalation(input.rawEscalation, input.hasCriticalTrigger);
    if (escReport.wasModerated) {
      decisionLogger.logDecision("escalation_change",
        `Escalation moderated: ${escReport.proposedLevel} → ${escReport.moderatedLevel}`,
        escReport.moderationReason,
        "medium",
        { beforeValue: escReport.proposedLevel, afterValue: escReport.moderatedLevel }
      );
    }

    // ═══ 8. Severity Evolution ═══
    const sevReport = severityValidator.validate(input.rawSeverity, "investigation");
    if (sevReport.wasModerated) {
      decisionLogger.logDecision("confidence_moderation",
        `Severity moderated: ${sevReport.originalSeverity} → ${sevReport.moderatedSeverity}`,
        sevReport.explanation,
        "medium"
      );
    }

    // ═══ 9. Temporal Consistency ═══
    const tReport = temporal.validateRecovery();
    if (!tReport.isPlausible) {
      allWarnings.push(...tReport.violations);
      decisionLogger.logDecision("recovery_assessment",
        "Recovery timeline adjusted",
        tReport.progressionNarrative,
        "medium"
      );
    }

    // ═══ 10. Investigation Coherence ═══
    const cohReport = coherence.evaluateCoherence(
      input.activeSymptoms, finalHypotheses,
      escReport.moderatedLevel, input.evidenceStrength,
      finalHypotheses[0]?.confidence || 0
    );
    cohReport.issues.forEach(issue => {
      allWarnings.push(issue.description);
    });

    // ═══ 11. Longitudinal Coherence ═══
    const longReport = longitudinal.validate();
    longReport.violations.forEach(v => {
      allWarnings.push(v.description);
    });

    // ═══ 12. Uncertainty ═══
    const uncertProfile = uncertaintyEngine.evaluate(
      input.activeSymptoms, finalHypotheses, input.evidenceStrength,
      wReport.isReliable, input.contradictionCount, input.daysUnresolved
    );
    if (uncertProfile.isAcknowledged) {
      decisionLogger.logDecision("uncertainty_acknowledgement",
        `Uncertainty level: ${uncertProfile.level}`,
        uncertProfile.narrativeFrame,
        uncertProfile.level === "high" || uncertProfile.level === "very_high" ? "high" : "low"
      );
    }

    // ═══ 13. Narrative Continuity ═══
    const narReport = narrative.recordAndValidate({
      statement: `Assessment: ${finalHypotheses[0]?.condition || "unknown"} at ${finalHypotheses[0]?.confidence || 0}%`,
      category: escReport.moderatedLevel === "none" || escReport.moderatedLevel === "low" ? "finding" : "escalation",
      confidence: finalHypotheses[0]?.confidence || 0,
    });
    if (!narReport.isContinuous) {
      narReport.contradictions.forEach(c => {
        decisionLogger.logDecision("contradiction_resolution",
          `Narrative ${c.type}: ${c.explanation}`,
          c.explanation,
          "medium"
        );
      });
    }

    // ═══ 14. Pacing ═══
    const pacingState = pacing.evaluatePacing({
      escalationLevel: escReport.moderatedLevel,
      uncertaintyLevel: uncertProfile.level,
      userResponseSpeed: input.userResponseSpeed,
      consecutiveQuestions: input.consecutiveQuestions,
      cognitiveLoadEstimate: input.cognitiveLoadEstimate,
      isFirstInvestigation: input.isFirstInvestigation,
    });

    // ═══ Aggregate Believability Scores ═══
    const reasoningScore = Math.max(0, 100 - (cReport.volatilityScore || 0));
    const evidenceScore = eReport.isEdgeCase ? Math.min(60, eReport.confidenceCap) : (input.evidenceStrength === "strong" ? 90 : input.evidenceStrength === "moderate" ? 65 : 35);
    const temporalScore = tReport.isPlausible ? 90 : 50;
    const wearableScore = wReport.reliabilityScore;
    const overall = Math.round((reasoningScore + evidenceScore + temporalScore + wearableScore) / 4);

    return {
      hypotheses: finalHypotheses,
      escalation: escReport.moderatedLevel,
      calmEscalationMessage: escReport.calmMessage,
      severity: sevReport,
      isStable: cReport.isStable && !escReport.wasModerated,
      confidenceStability: primaryStability,
      hypothesisEvolution: evoReport,
      coherence: cohReport,
      longitudinalCoherence: longReport,
      uncertainty: uncertProfile,
      narrativeContinuity: narReport,
      wearablePenaltyApplied: !wReport.isReliable,
      edgeCaseDisclosure: eReport.isEdgeCase ? eReport.disclosure : undefined,
      pacing: pacingState,
      believabilityScores: {
        reasoning: reasoningScore,
        evidence: evidenceScore,
        temporal: temporalScore,
        wearable: wearableScore,
        overall,
      },
      allWarnings,
    };
  }, [
    consistency, escalationEngine, temporal, wearable, edgeCase, stability,
    confStability, evolution, coherence, severityValidator, uncertaintyEngine,
    longitudinal, narrative, decisionLogger, pacing,
  ]);

  return {
    validateFull,
    getAuditHistory: consistency.getAuditHistory,
    getDecisionLog: decisionLogger.getLog,
    getRecentDecisions: decisionLogger.getRecentSignificant,
    evaluatePacing: stability.evaluatePacing,
  };
}

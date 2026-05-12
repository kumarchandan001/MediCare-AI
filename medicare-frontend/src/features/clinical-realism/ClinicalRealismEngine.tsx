/**
 * ClinicalRealismEngine — Master orchestrator for Phase 4 Realism.
 * Coordinates consistency, escalation, edge cases, and temporal constraints.
 * Sits between raw backend data and UI, ensuring all outputs are medically
 * believable, stable, and emotionally safe.
 */
import { useCallback, useRef } from "react";
import { useReasoningConsistency, ConsistencyReport } from "./ReasoningConsistencyTracker";
import { useEscalationRealism, EscalationReport, EscalationLevel } from "./EscalationRealismLayer";
import { useTemporalConsistency, TemporalValidation } from "./TemporalConsistencyEngine";
import { useWearableReliability, WearableReliabilityReport } from "./WearableReliabilityEngine";
import { useEdgeCaseReasoning, EdgeCaseReport } from "./EdgeCaseReasoningEngine";
import { useDecisionStability } from "./DecisionStabilityEngine";

export interface RealismValidationResult {
  hypotheses: { condition: string; confidence: number }[];
  escalation: EscalationLevel;
  calmEscalationMessage: string;
  isStable: boolean;
  wearablePenaltyApplied: boolean;
  edgeCaseDisclosure?: string;
  reports: {
    consistency: ConsistencyReport;
    escalation: EscalationReport;
    temporal: TemporalValidation;
    wearable: WearableReliabilityReport;
    edgeCase: EdgeCaseReport;
  };
}

export function useClinicalRealism() {
  const consistency = useReasoningConsistency();
  const escalationEngine = useEscalationRealism();
  const temporal = useTemporalConsistency();
  const wearable = useWearableReliability();
  const edgeCase = useEdgeCaseReasoning();
  const stability = useDecisionStability();

  /**
   * Primary entry point. Pass raw data from the backend through this validator
   * before updating the InvestigationStateProvider.
   */
  const validateReasoningTurn = useCallback((
    rawHypotheses: { condition: string; confidence: number }[],
    rawEscalation: EscalationLevel,
    evidenceStrength: string,
    activeSymptoms: string[],
    hasCriticalTrigger: boolean,
    currentHR: number,
    currentHRV: number,
    wearableDriftDetected: boolean,
    daysUnresolved: number
  ): RealismValidationResult => {
    
    // 1. Wearable Reliability
    const wReport = wearable.assessReliability(currentHR, currentHRV, wearableDriftDetected);
    
    // 2. Edge Case Detection (Sparse Evidence, Conflicts)
    const eReport = edgeCase.evaluateEdgeCases(activeSymptoms, rawHypotheses, daysUnresolved);

    // 3. Apply Penalties & Caps to Raw Hypotheses BEFORE smoothing
    let adjustedHypotheses = rawHypotheses.map(hyp => {
      let conf = hyp.confidence;
      if (!wReport.isReliable) conf *= (1 - wReport.confidencePenalty);
      if (eReport.isEdgeCase) conf = Math.min(conf, eReport.confidenceCap);
      return { ...hyp, confidence: conf };
    });

    // 4. Reasoning Consistency (Smoothing jumps)
    const cReport = consistency.moderateHypotheses(adjustedHypotheses, evidenceStrength);
    
    // Format hypotheses back to standard shape
    const finalHypotheses = cReport.moderatedHypotheses.map(m => ({
      condition: m.condition,
      confidence: m.moderated,
    }));

    // 5. Escalation Realism
    const escReport = escalationEngine.moderateEscalation(rawEscalation, hasCriticalTrigger);

    // 6. Temporal/Biological Constraints (Contextual validation, doesn't mutate hypotheses directly here but provides warnings)
    const tReport = temporal.validateRecovery(); 

    // Combine results
    return {
      hypotheses: finalHypotheses,
      escalation: escReport.moderatedLevel,
      calmEscalationMessage: escReport.calmMessage,
      isStable: cReport.isStable && !escReport.wasModerated,
      wearablePenaltyApplied: !wReport.isReliable,
      edgeCaseDisclosure: eReport.isEdgeCase ? eReport.disclosure : undefined,
      reports: {
        consistency: cReport,
        escalation: escReport,
        temporal: tReport,
        wearable: wReport,
        edgeCase: eReport,
      }
    };

  }, [consistency, escalationEngine, temporal, wearable, edgeCase]);

  const getAuditHistory = consistency.getAuditHistory;

  return { validateReasoningTurn, getAuditHistory, evaluatePacing: stability.evaluatePacing };
}

/**
 * MedicalOversightReadiness — The final gatekeeper that determines if the
 * AI system has met all clinical validation, trust, and governance thresholds
 * required before any form of deployment or clinical trial use.
 */
import { useCallback } from "react";
import { useGovernanceConfidenceTracker } from "../trust/GovernanceConfidenceTracker";
import { useTrustEvolutionEngine } from "../trust/TrustEvolutionEngine";
import { useEmotionalSafetyEvaluation } from "../trust/EmotionalSafetyEvaluation";

export interface OversightReadinessReport {
  timestamp: number;
  isReady: boolean;
  governanceStatus: "approved" | "blocked" | "pending";
  trustTrajectory: "growing" | "declining" | "stable";
  emotionalSafetyPassed: boolean;
  blockers: string[];
  recommendations: string[];
}

export function useMedicalOversightReadiness() {
  const { getGovernanceStatus } = useGovernanceConfidenceTracker();
  const { getTrustTrajectory } = useTrustEvolutionEngine();
  const { evaluateSafety } = useEmotionalSafetyEvaluation();

  const assessReadiness = useCallback((): OversightReadinessReport => {
    const governance = getGovernanceStatus();
    const trustTrajectory = getTrustTrajectory();
    const safety = evaluateSafety();

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (governance.status === "blocked") {
      blockers.push("Governance reviewers have blocked deployment due to critical concerns.");
    }
    if (governance.status === "pending") {
      blockers.push("Governance review is still pending — all reviewers must submit assessments.");
    }
    if (trustTrajectory === "declining") {
      blockers.push("User trust is declining — investigate communication tone and transparency.");
    }
    if (!safety.isEmotionallySafe) {
      blockers.push("Emotional safety threshold not met — escalation tone may be causing distress.");
      recommendations.push(...safety.recommendations);
    }

    if (trustTrajectory === "stable") {
      recommendations.push("Consider A/B testing new transparency features to actively grow trust.");
    }

    const isReady = blockers.length === 0 && governance.status === "approved";

    return {
      timestamp: Date.now(),
      isReady,
      governanceStatus: governance.status,
      trustTrajectory,
      emotionalSafetyPassed: safety.isEmotionallySafe,
      blockers,
      recommendations,
    };
  }, [getGovernanceStatus, getTrustTrajectory, evaluateSafety]);

  return { assessReadiness };
}

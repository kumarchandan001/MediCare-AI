/**
 * EmotionalSafetyEvaluation — Aggregates metrics from confidence and
 * perception tracking to provide a master "Safety Score" for the system's
 * communication layer.
 */
import { useUserConfidenceTracking } from "./UserConfidenceTracking";
import { useEscalationPerceptionTesting } from "./EscalationPerceptionTesting";

export function useEmotionalSafetyEvaluation() {
  const { metrics } = useUserConfidenceTracking();
  const { getPanicRate } = useEscalationPerceptionTesting();

  const evaluateSafety = () => {
    let safetyScore = 100;
    
    // Penalize for high anxiety averages
    const highAnxietyCount = metrics.filter(m => m.anxietyLevel >= 4).length;
    if (metrics.length > 0) {
      const anxietyRatio = highAnxietyCount / metrics.length;
      safetyScore -= (anxietyRatio * 50); // Up to 50 point penalty
    }

    // Penalize for panic-inducing escalations
    const panicRate = getPanicRate();
    if (panicRate > 10) {
      safetyScore -= 30; // Hard penalty if more than 10% of escalations cause panic
    }

    return {
      safetyScore: Math.max(0, safetyScore),
      isEmotionallySafe: safetyScore >= 80,
      recommendations: safetyScore < 80 
        ? ["Review escalation tone", "Ensure actionable steps are always provided"]
        : []
    };
  };

  return { evaluateSafety };
}

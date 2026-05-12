/**
 * DecisionStabilityEngine — Balances investigation pacing and prevents overreaction.
 * Controls when to prompt follow-ups and manages interaction pacing.
 */
import { useCallback } from "react";
import { useInvestigation } from "@/features/unified-clinical-workspace/InvestigationStateProvider";

export function useDecisionStability() {
  const inv = useInvestigation();

  /**
   * Determines if the AI is asking questions too rapidly or pivoting too fast.
   */
  const evaluatePacing = useCallback((): { isTooFast: boolean; suggestion: string } => {
    const { conversation } = inv;
    
    // Check if the last 3 questions happened in under 15 seconds (unrealistic for a human to read and answer thoughtfully)
    if (conversation.length >= 6) { // 3 Q&A pairs
      const recentQA = conversation.slice(-6);
      const timeSpan = recentQA[recentQA.length - 1].timestamp - recentQA[0].timestamp;
      
      if (timeSpan < 15000) { // 15 seconds
        return {
          isTooFast: true,
          suggestion: "Pacing is rapid. Consider adding a reflective pause or summarizing before the next question.",
        };
      }
    }

    return { isTooFast: false, suggestion: "" };
  }, [inv]);

  return { evaluatePacing };
}

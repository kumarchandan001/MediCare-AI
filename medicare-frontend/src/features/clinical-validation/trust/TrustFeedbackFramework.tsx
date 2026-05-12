/**
 * TrustFeedbackFramework — Captures explicit and implicit user feedback
 * on the AI's clinical explanations to measure how much the patient trusts
 * the reasoning process.
 */
import { useCallback, useState } from "react";

export interface TrustFeedback {
  sessionId: string;
  explanationClarity: number; // 1-5
  perceivedEmpathy: number; // 1-5
  actionability: number; // 1-5
  freeTextComment?: string;
  timestamp: number;
}

export function useTrustFeedbackFramework() {
  const [feedbackLog, setFeedbackLog] = useState<TrustFeedback[]>([]);

  const submitFeedback = useCallback((feedback: Omit<TrustFeedback, "timestamp">) => {
    const entry = { ...feedback, timestamp: Date.now() };
    setFeedbackLog(prev => [entry, ...prev]);
    return entry;
  }, []);

  const calculateTrustScore = useCallback(() => {
    if (feedbackLog.length === 0) return 100;
    
    const sum = feedbackLog.reduce((acc, curr) => {
      // average of the three 1-5 metrics scaled to 100
      const averageOutOf5 = (curr.explanationClarity + curr.perceivedEmpathy + curr.actionability) / 3;
      return acc + (averageOutOf5 / 5) * 100;
    }, 0);
    
    return sum / feedbackLog.length;
  }, [feedbackLog]);

  return { submitFeedback, calculateTrustScore, feedbackLog };
}

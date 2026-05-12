/**
 * UserConfidenceTracking — Monitors how confident the user feels in managing
 * their health based on the AI's guidance, alerting if the AI is accidentally
 * increasing health anxiety.
 */
import { useCallback, useState } from "react";

export interface ConfidenceMetric {
  timestamp: number;
  anxietyLevel: number; // 1 (calm) to 5 (highly anxious)
  clarityOfNextSteps: number; // 1 (confused) to 5 (very clear)
}

export function useUserConfidenceTracking() {
  const [metrics, setMetrics] = useState<ConfidenceMetric[]>([]);

  const logConfidence = useCallback((anxiety: number, clarity: number) => {
    const entry: ConfidenceMetric = {
      timestamp: Date.now(),
      anxietyLevel: anxiety,
      clarityOfNextSteps: clarity,
    };
    setMetrics(prev => [...prev, entry]);
    
    // Simple alert heuristic
    if (anxiety >= 4 && clarity <= 2) {
      console.warn("High Health Anxiety Detected: The system's communication may be causing distress without clear actionable steps.");
    }
  }, []);

  return { metrics, logConfidence };
}

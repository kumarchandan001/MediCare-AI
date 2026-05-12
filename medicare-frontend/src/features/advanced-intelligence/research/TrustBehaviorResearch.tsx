/**
 * TrustBehaviorResearch — Studies how user trust evolves with AI health
 * interactions over time for research and system improvement.
 */
import { useCallback, useRef } from "react";

export interface TrustDataPoint {
  sessionId: string;
  trustScore: number;
  aiAccuracy: number;
  userOverrideRate: number;
  escalationFollowed: boolean;
  timestamp: number;
  interactionType: string;
}

export interface TrustResearchInsight {
  finding: string;
  pattern: "trust_building" | "trust_erosion" | "trust_recovery" | "stable_trust";
  significance: number;
  dataPoints: number;
  recommendation: string;
}

export function useTrustBehaviorResearch() {
  const data = useRef<TrustDataPoint[]>([]);

  const recordDataPoint = useCallback((point: TrustDataPoint): void => {
    data.current = [...data.current.slice(-999), point];
  }, []);

  const analyzePatterns = useCallback((): TrustResearchInsight[] => {
    const insights: TrustResearchInsight[] = [];
    if (data.current.length < 10) return insights;
    const recent = data.current.slice(-50);
    const older = data.current.slice(-100, -50);
    if (older.length > 0) {
      const recentAvg = recent.reduce((s, d) => s + d.trustScore, 0) / recent.length;
      const olderAvg = older.reduce((s, d) => s + d.trustScore, 0) / older.length;
      if (recentAvg > olderAvg + 5) {
        insights.push({ finding: "Trust scores are increasing over time", pattern: "trust_building", significance: 0.7, dataPoints: recent.length + older.length, recommendation: "Current interaction patterns are building user trust — maintain approach" });
      } else if (recentAvg < olderAvg - 5) {
        insights.push({ finding: "Trust scores show decline", pattern: "trust_erosion", significance: 0.75, dataPoints: recent.length + older.length, recommendation: "Review recent AI interactions for accuracy and communication quality" });
      }
    }
    const highOverride = recent.filter(d => d.userOverrideRate > 0.5);
    if (highOverride.length > recent.length * 0.3) {
      insights.push({ finding: "High user override rate suggests AI recommendations may not align with user expectations", pattern: "trust_erosion", significance: 0.65, dataPoints: highOverride.length, recommendation: "Calibrate AI confidence and improve recommendation relevance" });
    }
    return insights;
  }, []);

  return { recordDataPoint, analyzePatterns };
}

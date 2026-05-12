/**
 * BehavioralSignalAnalyzer — Analyzes behavioral patterns (app usage,
 * interaction timing, response patterns) as passive health signals.
 */
import { useCallback, useRef } from "react";

export interface BehavioralSignal {
  type: "app_usage" | "interaction_speed" | "response_pattern" | "routine_adherence" | "engagement_level";
  value: number;
  baseline: number;
  deviation: number;
  timestamp: number;
}

export interface BehavioralInsight {
  pattern: string;
  significance: "informational" | "noteworthy" | "concerning";
  relatedHealthDomains: string[];
  confidence: number;
  description: string;
  privacyNote: string;
}

export function useBehavioralSignalAnalyzer() {
  const history = useRef<BehavioralSignal[]>([]);

  const recordSignal = useCallback((signal: BehavioralSignal): void => {
    history.current = [...history.current.slice(-499), signal];
  }, []);

  const analyzePatterns = useCallback((): BehavioralInsight[] => {
    const insights: BehavioralInsight[] = [];
    const recent = history.current.filter(s => Date.now() - s.timestamp < 7 * 86400000);
    if (recent.length < 10) return insights;

    const byType = new Map<string, BehavioralSignal[]>();
    recent.forEach(s => { const arr = byType.get(s.type) || []; arr.push(s); byType.set(s.type, arr); });

    const usage = byType.get("app_usage");
    if (usage) {
      const avgDeviation = usage.reduce((s, u) => s + u.deviation, 0) / usage.length;
      if (avgDeviation < -30) {
        insights.push({ pattern: "Reduced app engagement", significance: "noteworthy", relatedHealthDomains: ["wellness", "emotional"], confidence: 55, description: "Your app interaction has decreased noticeably. This could reflect many things — busy schedule, feeling better, or reduced motivation.", privacyNote: "This observation is based only on general usage patterns, not content." });
      }
    }

    const speed = byType.get("interaction_speed");
    if (speed) {
      const avgSpeed = speed.reduce((s, sp) => s + sp.value, 0) / speed.length;
      if (avgSpeed < speed[0]?.baseline * 0.7) {
        insights.push({ pattern: "Slower interaction patterns", significance: "informational", relatedHealthDomains: ["cognitive", "fatigue"], confidence: 40, description: "Interaction speed has slowed. This is a very general observation and could have many explanations.", privacyNote: "Only aggregate timing data is analyzed — no content or personal data." });
      }
    }

    return insights;
  }, []);

  return { recordSignal, analyzePatterns };
}

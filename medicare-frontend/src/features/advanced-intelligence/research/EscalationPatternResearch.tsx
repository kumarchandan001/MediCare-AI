/**
 * EscalationPatternResearch — Studies escalation patterns to improve
 * the platform's escalation accuracy and reduce false alarms.
 */
import { useCallback, useRef } from "react";

export interface EscalationEvent {
  id: string;
  type: string;
  severity: string;
  wasAppropriate: boolean | null;
  userFollowedUp: boolean;
  outcomeConfirmed: boolean;
  timestamp: number;
}

export interface EscalationResearch {
  totalEscalations: number;
  appropriateRate: number;
  falsePositiveRate: number;
  userFollowUpRate: number;
  topPatterns: { type: string; count: number; appropriateRate: number }[];
  recommendations: string[];
}

export function useEscalationPatternResearch() {
  const events = useRef<EscalationEvent[]>([]);

  const record = useCallback((event: EscalationEvent): void => {
    events.current = [...events.current.slice(-999), event];
  }, []);

  const analyze = useCallback((): EscalationResearch => {
    const all = events.current;
    if (all.length === 0) return { totalEscalations: 0, appropriateRate: 0, falsePositiveRate: 0, userFollowUpRate: 0, topPatterns: [], recommendations: [] };
    const evaluated = all.filter(e => e.wasAppropriate !== null);
    const appropriate = evaluated.filter(e => e.wasAppropriate);
    const followedUp = all.filter(e => e.userFollowedUp);
    const byType = new Map<string, EscalationEvent[]>();
    all.forEach(e => { const arr = byType.get(e.type) || []; arr.push(e); byType.set(e.type, arr); });
    const topPatterns = Array.from(byType.entries()).map(([type, evts]) => {
      const eval2 = evts.filter(e => e.wasAppropriate !== null);
      return { type, count: evts.length, appropriateRate: eval2.length > 0 ? eval2.filter(e => e.wasAppropriate).length / eval2.length : 0 };
    }).sort((a, b) => b.count - a.count).slice(0, 5);
    const recommendations: string[] = [];
    const fpRate = evaluated.length > 0 ? 1 - appropriate.length / evaluated.length : 0;
    if (fpRate > 0.3) recommendations.push("High false positive rate — consider raising escalation thresholds");
    if (followedUp.length / all.length < 0.3) recommendations.push("Low user follow-up — consider improving escalation messaging clarity");
    return { totalEscalations: all.length, appropriateRate: evaluated.length > 0 ? appropriate.length / evaluated.length : 0, falsePositiveRate: fpRate, userFollowUpRate: all.length > 0 ? followedUp.length / all.length : 0, topPatterns, recommendations };
  }, []);

  return { record, analyze };
}

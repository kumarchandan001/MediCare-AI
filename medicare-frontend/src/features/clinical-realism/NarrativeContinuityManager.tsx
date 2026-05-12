/**
 * NarrativeContinuityManager — Ensures the clinical story told to the user
 * remains temporally coherent and doesn't contradict itself across turns
 * or sessions. Maintains a narrative memory and flags discontinuities.
 */
import { useCallback, useRef } from "react";

export interface NarrativeEvent {
  id: string;
  statement: string;
  category: "finding" | "escalation" | "recovery" | "reassurance" | "recommendation";
  timestamp: number;
  confidence: number;
}

export interface ContinuityReport {
  isContinuous: boolean;
  contradictions: NarrativeContradiction[];
  suggestedCorrections: string[];
  narrativeHealth: "excellent" | "good" | "fragmented" | "contradictory";
}

export interface NarrativeContradiction {
  previousStatement: string;
  currentStatement: string;
  type: "reversal" | "inconsistency" | "premature_closure" | "tone_shift";
  explanation: string;
}

export function useNarrativeContinuity() {
  const memoryRef = useRef<NarrativeEvent[]>([]);
  const contradictionLogRef = useRef<NarrativeContradiction[]>([]);

  /**
   * Record a narrative event and check for contradictions with history.
   */
  const recordAndValidate = useCallback((event: Omit<NarrativeEvent, "id" | "timestamp">): ContinuityReport => {
    const fullEvent: NarrativeEvent = {
      ...event,
      id: `narr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    const contradictions: NarrativeContradiction[] = [];
    const corrections: string[] = [];
    const recentMemory = memoryRef.current.slice(-10);

    for (const prev of recentMemory) {
      // Recovery → Escalation reversal
      if (prev.category === "recovery" && event.category === "escalation") {
        const hoursBetween = (Date.now() - prev.timestamp) / 3_600_000;
        if (hoursBetween < 4) {
          contradictions.push({
            previousStatement: prev.statement,
            currentStatement: event.statement,
            type: "reversal",
            explanation: `Recovery narrative reversed to escalation within ${hoursBetween.toFixed(1)} hours.`,
          });
          corrections.push("Consider framing as 'ongoing observation revealed new factors' rather than contradicting prior recovery progress.");
        }
      }

      // Reassurance → High escalation too fast
      if (prev.category === "reassurance" && event.category === "escalation" && event.confidence > 70) {
        const hoursBetween = (Date.now() - prev.timestamp) / 3_600_000;
        if (hoursBetween < 2) {
          contradictions.push({
            previousStatement: prev.statement,
            currentStatement: event.statement,
            type: "tone_shift",
            explanation: "Tone shifted from reassurance to high-confidence escalation within 2 hours.",
          });
          corrections.push("Transition the narrative through 'attentive observation' before escalating to maintain trust.");
        }
      }

      // Same category, opposite confidence direction
      if (prev.category === event.category && prev.category === "finding") {
        const confDelta = event.confidence - prev.confidence;
        if (Math.abs(confDelta) > 40) {
          contradictions.push({
            previousStatement: prev.statement,
            currentStatement: event.statement,
            type: "inconsistency",
            explanation: `Confidence for a finding shifted by ${confDelta.toFixed(0)}% — this may feel contradictory to the user.`,
          });
          corrections.push("Explain the confidence shift: 'New information has updated our understanding.'");
        }
      }
    }

    // Store
    memoryRef.current.push(fullEvent);
    if (memoryRef.current.length > 50) memoryRef.current.shift();
    contradictionLogRef.current.push(...contradictions);
    if (contradictionLogRef.current.length > 100) contradictionLogRef.current = contradictionLogRef.current.slice(-50);

    // Health
    let narrativeHealth: ContinuityReport["narrativeHealth"];
    if (contradictions.length === 0) narrativeHealth = "excellent";
    else if (contradictions.every(c => c.type === "inconsistency")) narrativeHealth = "good";
    else if (contradictions.some(c => c.type === "reversal")) narrativeHealth = "contradictory";
    else narrativeHealth = "fragmented";

    return {
      isContinuous: contradictions.length === 0,
      contradictions,
      suggestedCorrections: corrections,
      narrativeHealth,
    };
  }, []);

  const getMemory = useCallback(() => [...memoryRef.current], []);
  const getContradictionLog = useCallback(() => [...contradictionLogRef.current], []);

  const reset = useCallback(() => {
    memoryRef.current = [];
    contradictionLogRef.current = [];
  }, []);

  return { recordAndValidate, getMemory, getContradictionLog, reset };
}

/**
 * EscalationRealismLayer — Ensures escalation evolves gradually and believably.
 * Prevents alarm-driven jumps; requires consecutive evidence accumulation
 * before escalating. Maintains a calm, clinically thoughtful tone.
 */
import { useCallback, useRef } from "react";

export type EscalationLevel = "none" | "low" | "moderate" | "elevated" | "urgent" | "emergency";

const ESCALATION_ORDER: EscalationLevel[] = ["none", "low", "moderate", "elevated", "urgent", "emergency"];

export interface EscalationEvent {
  from: EscalationLevel;
  to: EscalationLevel;
  reason: string;
  wasModerated: boolean;
  timestamp: number;
}

export interface EscalationReport {
  currentLevel: EscalationLevel;
  proposedLevel: EscalationLevel;
  moderatedLevel: EscalationLevel;
  wasModerated: boolean;
  consecutiveWarnings: number;
  moderationReason: string;
  calmMessage: string;
  events: EscalationEvent[];
}

const CALM_MESSAGES: Record<EscalationLevel, string> = {
  none: "No concerns detected at this time.",
  low: "Some mild indicators are being noted — nothing that requires immediate action.",
  moderate: "A few signals are worth paying attention to. Continued observation is recommended.",
  elevated: "Several indicators suggest this may benefit from professional guidance when convenient.",
  urgent: "The combination of signals suggests timely medical attention would be advisable.",
  emergency: "These indicators suggest seeking immediate medical attention. Please consider contacting a healthcare provider now.",
};

export function useEscalationRealism() {
  const currentLevelRef = useRef<EscalationLevel>("none");
  const consecutiveRef = useRef(0);
  const eventsRef = useRef<EscalationEvent[]>([]);

  /**
   * Validate and moderate a proposed escalation level.
   * Allows at most +1 step increase per turn unless critical trigger detected.
   */
  const moderateEscalation = useCallback((
    proposed: EscalationLevel,
    hasCriticalTrigger: boolean
  ): EscalationReport => {
    const currentIdx = ESCALATION_ORDER.indexOf(currentLevelRef.current);
    const proposedIdx = ESCALATION_ORDER.indexOf(proposed);
    let moderatedIdx = proposedIdx;
    let wasModerated = false;
    let moderationReason = "";

    // Critical triggers allow immediate jump to urgent (but not emergency without consecutive)
    if (hasCriticalTrigger) {
      moderatedIdx = Math.min(proposedIdx, Math.max(currentIdx + 2, 4)); // Cap at urgent
      if (moderatedIdx < proposedIdx) {
        wasModerated = true;
        moderationReason = "Critical trigger detected but escalation moderated for safety.";
      }
    } else {
      // Normal: allow at most +1 step per turn
      if (proposedIdx > currentIdx + 1) {
        moderatedIdx = currentIdx + 1;
        wasModerated = true;
        moderationReason = `Escalation moderated: step-by-step progression (${ESCALATION_ORDER[currentIdx]} → ${ESCALATION_ORDER[moderatedIdx]}) instead of jumping to ${proposed}.`;
      }

      // De-escalation can happen freely (clinical improvement)
      if (proposedIdx < currentIdx) {
        moderatedIdx = Math.max(proposedIdx, currentIdx - 2); // Max 2 steps down
      }
    }

    // Track consecutive warnings at elevated+
    if (moderatedIdx >= 3) {
      consecutiveRef.current += 1;
    } else {
      consecutiveRef.current = Math.max(0, consecutiveRef.current - 1);
    }

    const moderatedLevel = ESCALATION_ORDER[moderatedIdx];

    const event: EscalationEvent = {
      from: currentLevelRef.current,
      to: moderatedLevel,
      reason: moderationReason || `Escalation: ${currentLevelRef.current} → ${moderatedLevel}`,
      wasModerated,
      timestamp: Date.now(),
    };
    eventsRef.current.push(event);
    if (eventsRef.current.length > 30) eventsRef.current.shift();

    currentLevelRef.current = moderatedLevel;

    return {
      currentLevel: currentLevelRef.current,
      proposedLevel: proposed,
      moderatedLevel,
      wasModerated,
      consecutiveWarnings: consecutiveRef.current,
      moderationReason: moderationReason || "No moderation needed.",
      calmMessage: CALM_MESSAGES[moderatedLevel],
      events: [...eventsRef.current],
    };
  }, []);

  const reset = useCallback(() => {
    currentLevelRef.current = "none";
    consecutiveRef.current = 0;
    eventsRef.current = [];
  }, []);

  return { moderateEscalation, reset };
}

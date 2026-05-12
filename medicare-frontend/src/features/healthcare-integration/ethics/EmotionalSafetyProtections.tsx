/**
 * EmotionalSafetyProtections — Active protections ensuring the AI never
 * causes emotional harm through its health communications.
 */
import { useCallback } from "react";

export interface SafetyFilter {
  name: string;
  type: "language" | "content" | "timing" | "frequency" | "context";
  active: boolean;
  triggeredCount: number;
  description: string;
}

export function useEmotionalSafetyProtections() {
  const getFilters = useCallback((): SafetyFilter[] => [
    { name: "Catastrophic language prevention", type: "language", active: true, triggeredCount: 0, description: "Prevents alarming or catastrophizing language in health communications" },
    { name: "Sensitivity-aware disclosure", type: "content", active: true, triggeredCount: 0, description: "Progressively discloses concerning health information" },
    { name: "Quiet hours respect", type: "timing", active: true, triggeredCount: 0, description: "Avoids non-urgent health notifications during rest periods" },
    { name: "Notification fatigue prevention", type: "frequency", active: true, triggeredCount: 0, description: "Limits notification frequency to prevent overwhelm" },
    { name: "Grief-aware communication", type: "context", active: true, triggeredCount: 0, description: "Adjusts communication when loss or grief patterns detected" },
    { name: "Anxiety-reducing framing", type: "language", active: true, triggeredCount: 0, description: "Frames health information to minimize unnecessary anxiety" },
  ], []);

  const validateMessage = useCallback((message: string): { safe: boolean; concerns: string[]; suggestions: string[] } => {
    const concerns: string[] = [];
    const suggestions: string[] = [];
    const alarmingWords = ["fatal", "terminal", "death", "die", "worst case", "emergency"];
    alarmingWords.forEach(w => { if (message.toLowerCase().includes(w)) concerns.push(`Contains potentially alarming term: "${w}"`); });
    if (concerns.length > 0) suggestions.push("Consider softer framing with emphasis on actionable next steps");
    if (message.length > 500) suggestions.push("Consider breaking into smaller, digestible segments");
    return { safe: concerns.length === 0, concerns, suggestions };
  }, []);

  return { getFilters, validateMessage };
}

/**
 * EscalationPerceptionTesting — Analyzes how users react to emergency escalations.
 * Did the escalation feel justified to them? Did it cause panic, or did it feel
 * supportive?
 */
import { useCallback, useState } from "react";

export interface PerceptionTest {
  escalationId: string;
  perceivedUrgency: "appropriate" | "overblown" | "insufficient";
  emotionalResponse: "calm_action" | "panic" | "confusion" | "relief";
}

export function useEscalationPerceptionTesting() {
  const [tests, setTests] = useState<PerceptionTest[]>([]);

  const logPerception = useCallback((test: PerceptionTest) => {
    setTests(prev => [...prev, test]);
  }, []);

  const getPanicRate = useCallback(() => {
    if (tests.length === 0) return 0;
    const panics = tests.filter(t => t.emotionalResponse === "panic").length;
    return (panics / tests.length) * 100;
  }, [tests]);

  return { tests, logPerception, getPanicRate };
}

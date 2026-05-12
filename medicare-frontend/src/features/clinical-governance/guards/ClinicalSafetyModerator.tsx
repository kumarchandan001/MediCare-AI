/**
 * ClinicalSafetyModerator — Ensures all user-facing text remains emotionally
 * safe, non-alarming, and medically bounded. Applies pacing constraints
 * and moderates companion personality to prevent inappropriate authority.
 */
import { useCallback } from "react";
import { EMOTIONAL_THRESHOLDS, UNSAFE_PATTERNS } from "./ClinicalSafetyThresholds";

export interface ModerationResult {
  isEmotionallySafe: boolean;
  moderatedText: string;
  toneAssessment: "calm" | "cautious" | "alarming";
  pacingAdvice: string;
  modifications: string[];
}

export function useClinicalSafetyModerator() {
  const moderate = useCallback((text: string, context: {
    escalationLevel: string;
    cognitiveLoad: number;
    consecutiveMessages: number;
    isFirstInteraction: boolean;
  }): ModerationResult => {
    const modifications: string[] = [];
    let moderated = text;

    // 1. Count alarming terms
    let alarmCount = 0;
    for (const term of UNSAFE_PATTERNS.ALARMING_TERMS) {
      if (moderated.toLowerCase().includes(term.toLowerCase())) {
        alarmCount++;
      }
    }

    // 2. Soften alarming language if too many terms
    if (alarmCount > EMOTIONAL_THRESHOLDS.MAX_ALARMING_TERMS) {
      const softeners: Record<string, string> = {
        "fatal": "serious",
        "terminal": "advanced",
        "death": "significant health concern",
        "dying": "requiring attention",
        "worst case": "in more serious scenarios",
        "life-threatening": "requiring prompt medical attention",
        "dangerous": "concerning",
        "critical condition": "condition needing medical evaluation",
      };
      for (const [alarming, soft] of Object.entries(softeners)) {
        const regex = new RegExp(alarming, "gi");
        if (regex.test(moderated)) {
          moderated = moderated.replace(regex, soft);
          modifications.push(`Softened "${alarming}" → "${soft}"`);
        }
      }
    }

    // 3. Add calming framing for high escalation
    if (context.escalationLevel === "critical" || context.escalationLevel === "emergency") {
      if (!moderated.includes("important to") && !moderated.includes("recommend")) {
        moderated = "While this warrants attention, " + moderated.charAt(0).toLowerCase() + moderated.slice(1);
        modifications.push("Added calming framing for escalation");
      }
    }

    // 4. Pacing advice based on cognitive load
    let pacingAdvice: string;
    if (context.cognitiveLoad > EMOTIONAL_THRESHOLDS.MAX_COGNITIVE_LOAD) {
      pacingAdvice = "Consider pausing — take a moment before reviewing further details.";
    } else if (context.consecutiveMessages > EMOTIONAL_THRESHOLDS.MAX_CONSECUTIVE_QUESTIONS) {
      pacingAdvice = "We've covered a lot. Would you like to take a break?";
    } else if (context.isFirstInteraction) {
      pacingAdvice = "Take your time — there's no rush to answer everything at once.";
    } else {
      pacingAdvice = "";
    }

    // 5. Tone assessment
    let toneAssessment: ModerationResult["toneAssessment"];
    if (alarmCount === 0 && context.escalationLevel !== "critical") {
      toneAssessment = "calm";
    } else if (alarmCount <= EMOTIONAL_THRESHOLDS.MAX_ALARMING_TERMS) {
      toneAssessment = "cautious";
    } else {
      toneAssessment = "alarming";
    }

    return {
      isEmotionallySafe: toneAssessment !== "alarming",
      moderatedText: moderated,
      toneAssessment,
      pacingAdvice,
      modifications,
    };
  }, []);

  return { moderate };
}

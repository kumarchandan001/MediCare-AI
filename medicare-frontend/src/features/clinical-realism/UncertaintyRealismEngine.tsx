/**
 * UncertaintyRealismEngine — Refines how the AI expresses and manages
 * uncertainty. Ensures ambiguity is communicated as "medical thoughtfulness"
 * rather than "AI confusion". Tracks how uncertainty evolves over time
 * and adjusts narrative tone accordingly.
 */
import { useCallback, useRef } from "react";

export type UncertaintyLevel = "minimal" | "low" | "moderate" | "substantial" | "high" | "very_high";

export interface UncertaintyProfile {
  level: UncertaintyLevel;
  score: number;                    // 0-100 (0 = certain, 100 = maximally uncertain)
  sources: UncertaintySource[];
  evolution: "decreasing" | "stable" | "increasing";
  narrativeFrame: string;           // How to talk about this uncertainty
  clinicalAdvice: string;           // What to recommend given uncertainty
  isAcknowledged: boolean;          // Whether UI should explicitly show uncertainty
}

export interface UncertaintySource {
  factor: string;
  weight: number;                   // 0-1
  description: string;
}

export function useUncertaintyRealism() {
  const historyRef = useRef<number[]>([]);

  const evaluate = useCallback((
    activeSymptoms: string[],
    hypotheses: { condition: string; confidence: number }[],
    evidenceStrength: string,
    wearableReliable: boolean,
    contradictionCount: number,
    daysUnresolved: number,
  ): UncertaintyProfile => {
    const sources: UncertaintySource[] = [];
    let totalUncertainty = 0;

    // 1. Evidence sparsity
    if (activeSymptoms.length <= 1) {
      sources.push({ factor: "Sparse evidence", weight: 0.3, description: "Very few symptoms reported." });
      totalUncertainty += 30;
    } else if (activeSymptoms.length <= 3) {
      sources.push({ factor: "Limited evidence", weight: 0.15, description: "A small number of symptoms available." });
      totalUncertainty += 15;
    }

    // 2. Hypothesis ambiguity (top conditions too close in confidence)
    if (hypotheses.length >= 2) {
      const spread = hypotheses[0].confidence - hypotheses[Math.min(1, hypotheses.length - 1)].confidence;
      if (spread < 10) {
        sources.push({ factor: "Differential ambiguity", weight: 0.25, description: "Multiple conditions are equally likely." });
        totalUncertainty += 25;
      } else if (spread < 20) {
        sources.push({ factor: "Moderate differential overlap", weight: 0.12, description: "Some overlap between top considerations." });
        totalUncertainty += 12;
      }
    }

    // 3. Evidence strength
    if (evidenceStrength === "weak" || evidenceStrength === "Weak") {
      sources.push({ factor: "Weak evidence basis", weight: 0.2, description: "Available evidence provides limited diagnostic clarity." });
      totalUncertainty += 20;
    }

    // 4. Wearable unreliability
    if (!wearableReliable) {
      sources.push({ factor: "Wearable instability", weight: 0.1, description: "Wearable data is currently unreliable." });
      totalUncertainty += 10;
    }

    // 5. Contradictions
    if (contradictionCount > 0) {
      const weight = Math.min(0.2, contradictionCount * 0.07);
      sources.push({ factor: "Active contradictions", weight, description: `${contradictionCount} contradictory signal(s) detected.` });
      totalUncertainty += contradictionCount * 7;
    }

    // 6. Unresolved duration
    if (daysUnresolved > 7) {
      sources.push({ factor: "Extended unresolved period", weight: 0.08, description: `Investigation ongoing for ${daysUnresolved} days.` });
      totalUncertainty += 8;
    }

    totalUncertainty = Math.min(100, Math.max(0, totalUncertainty));

    // Track evolution
    historyRef.current.push(totalUncertainty);
    if (historyRef.current.length > 20) historyRef.current.shift();

    let evolution: UncertaintyProfile["evolution"] = "stable";
    if (historyRef.current.length >= 3) {
      const recent = historyRef.current.slice(-3);
      const trend = recent[2] - recent[0];
      if (trend > 10) evolution = "increasing";
      else if (trend < -10) evolution = "decreasing";
    }

    // Map to level
    let level: UncertaintyLevel;
    if (totalUncertainty < 10) level = "minimal";
    else if (totalUncertainty < 25) level = "low";
    else if (totalUncertainty < 40) level = "moderate";
    else if (totalUncertainty < 60) level = "substantial";
    else if (totalUncertainty < 80) level = "high";
    else level = "very_high";

    // Narrative framing — uncertainty as thoughtfulness, not confusion
    const narrativeFrames: Record<UncertaintyLevel, string> = {
      minimal: "Current evidence points clearly in one direction.",
      low: "The picture is becoming clearer, though continued observation is wise.",
      moderate: "Several factors are still being weighed — this is normal in early assessment.",
      substantial: "There's meaningful complexity here. A measured approach ensures nothing is overlooked.",
      high: "The clinical picture is nuanced. Multiple possibilities are being carefully considered.",
      very_high: "Significant ambiguity exists. The most responsible approach is careful, ongoing observation.",
    };

    // Clinical advice
    const adviceMap: Record<UncertaintyLevel, string> = {
      minimal: "Findings can be discussed with reasonable confidence.",
      low: "Assessment is fairly clear — standard follow-up is appropriate.",
      moderate: "Consider discussing findings with a healthcare provider for additional clarity.",
      substantial: "Professional medical evaluation would help resolve remaining questions.",
      high: "Recommend scheduling a consultation to obtain additional diagnostic information.",
      very_high: "Given the complexity, professional evaluation is strongly recommended.",
    };

    return {
      level,
      score: totalUncertainty,
      sources,
      evolution,
      narrativeFrame: narrativeFrames[level],
      clinicalAdvice: adviceMap[level],
      isAcknowledged: totalUncertainty >= 30,
    };
  }, []);

  const getHistory = useCallback(() => [...historyRef.current], []);

  const reset = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { evaluate, getHistory, reset };
}

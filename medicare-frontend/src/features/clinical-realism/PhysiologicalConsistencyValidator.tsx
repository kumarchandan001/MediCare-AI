/**
 * PhysiologicalConsistencyValidator — Cross-references wearable signals
 * with symptoms and hypotheses to detect physiological inconsistencies.
 * A high heart rate with "fatigue only" and no fever → suspicious.
 * Low HRV with "feeling great" → possible artifact.
 */
import { useCallback } from "react";

export interface PhysiologicalCheck {
  isConsistent: boolean;
  inconsistencies: PhysiologicalInconsistency[];
  overallAssessment: string;
  wearableWeight: number; // 0-1, how much to trust wearable in final reasoning
}

export interface PhysiologicalInconsistency {
  signal: string;
  symptomContext: string;
  nature: "contradictory" | "unsupported" | "artifact_likely";
  explanation: string;
}

export function usePhysiologicalConsistency() {
  const validate = useCallback((
    heartRate: number,
    hrv: number,
    restingHRBaseline: number,
    hrvBaseline: number,
    activeSymptoms: string[],
    reportedFeeling: "good" | "neutral" | "unwell" | "unknown",
  ): PhysiologicalCheck => {
    const inconsistencies: PhysiologicalInconsistency[] = [];
    let wearableWeight = 1.0;

    const symptomSet = new Set(activeSymptoms.map(s => s.toLowerCase()));
    const hrElevated = restingHRBaseline > 0 && heartRate > restingHRBaseline * 1.3;
    const hrvDepressed = hrvBaseline > 0 && hrv < hrvBaseline * 0.5;

    // 1. High HR but no cardiac/anxiety/fever symptoms
    if (hrElevated && !symptomSet.has("palpitations") && !symptomSet.has("anxiety") &&
        !symptomSet.has("fever") && !symptomSet.has("chest_pain") && !symptomSet.has("shortness_of_breath")) {
      inconsistencies.push({
        signal: `Heart rate elevated (${heartRate} vs baseline ${restingHRBaseline})`,
        symptomContext: "No cardiac, anxiety, or fever symptoms reported",
        nature: activeSymptoms.length === 0 ? "artifact_likely" : "unsupported",
        explanation: "Elevated heart rate without corresponding symptoms may indicate physical activity, caffeine, or sensor artifact.",
      });
      wearableWeight -= 0.2;
    }

    // 2. Very low HRV but user reports feeling good
    if (hrvDepressed && reportedFeeling === "good") {
      inconsistencies.push({
        signal: `HRV significantly depressed (${hrv} vs baseline ${hrvBaseline})`,
        symptomContext: "User reports feeling well",
        nature: "contradictory",
        explanation: "Low HRV typically indicates stress or autonomic imbalance, but the user reports feeling well. This may be a transient reading.",
      });
      wearableWeight -= 0.15;
    }

    // 3. Normal vitals but severe symptoms reported
    if (!hrElevated && !hrvDepressed && symptomSet.has("chest_pain")) {
      inconsistencies.push({
        signal: `Heart rate and HRV are within normal range`,
        symptomContext: "User reports chest pain",
        nature: "unsupported",
        explanation: "Chest pain without vital sign changes may indicate musculoskeletal cause, but cardiac causes cannot be ruled out by wearable data alone.",
      });
      // Don't reduce weight — symptoms take priority for chest pain
    }

    // 4. All signals elevated + feeling unwell → consistent, increase trust
    if (hrElevated && hrvDepressed && reportedFeeling === "unwell") {
      wearableWeight = Math.min(1.0, wearableWeight + 0.1);
    }

    wearableWeight = Math.max(0.1, Math.min(1.0, wearableWeight));

    let overallAssessment: string;
    if (inconsistencies.length === 0) {
      overallAssessment = "Wearable signals are consistent with reported symptoms.";
    } else if (inconsistencies.some(i => i.nature === "artifact_likely")) {
      overallAssessment = "Some wearable readings may be artifacts — placing less emphasis on sensor data for this assessment.";
    } else if (inconsistencies.some(i => i.nature === "contradictory")) {
      overallAssessment = "Wearable signals and symptoms show some contradictions — using a balanced interpretation.";
    } else {
      overallAssessment = "Minor signal-symptom mismatches noted — wearable data is being weighted cautiously.";
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      overallAssessment,
      wearableWeight,
    };
  }, []);

  return { validate };
}

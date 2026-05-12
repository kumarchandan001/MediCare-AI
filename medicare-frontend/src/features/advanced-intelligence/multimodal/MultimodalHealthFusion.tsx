/**
 * MultimodalHealthFusion — Fuses signals from symptoms, wearables,
 * behavioral patterns, and environmental context into unified
 * multimodal health intelligence.
 */
import { useCallback } from "react";

export type ModalityType = "symptom" | "wearable" | "behavioral" | "environmental" | "contextual" | "longitudinal";

export interface ModalitySignal {
  modality: ModalityType;
  source: string;
  value: number;
  confidence: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface FusedHealthInsight {
  id: string;
  insight: string;
  contributingModalities: ModalityType[];
  confidence: number;
  impact: "positive" | "neutral" | "negative" | "mixed";
  actionable: boolean;
  suggestedAction: string | null;
  fusionScore: number;
}

export interface MultimodalSnapshot {
  timestamp: number;
  activeModalities: ModalityType[];
  signalCount: number;
  fusedInsights: FusedHealthInsight[];
  overallCoherence: number;
  dataCompleteness: number;
}

export function useMultimodalHealthFusion() {
  const fuseSignals = useCallback((signals: ModalitySignal[]): MultimodalSnapshot => {
    const modalities = [...new Set(signals.map(s => s.modality))];
    const allModalities: ModalityType[] = ["symptom", "wearable", "behavioral", "environmental", "contextual", "longitudinal"];
    const completeness = modalities.length / allModalities.length;

    // Cross-modal insight detection
    const insights: FusedHealthInsight[] = [];
    const byModality = new Map<ModalityType, ModalitySignal[]>();
    signals.forEach(s => { const arr = byModality.get(s.modality) || []; arr.push(s); byModality.set(s.modality, arr); });

    // Wearable + Behavioral correlation
    const wearable = byModality.get("wearable");
    const behavioral = byModality.get("behavioral");
    if (wearable && behavioral) {
      const avgWearable = wearable.reduce((s, w) => s + w.value, 0) / wearable.length;
      const avgBehavioral = behavioral.reduce((s, b) => s + b.value, 0) / behavioral.length;
      if (avgWearable < 40 && avgBehavioral < 40) {
        insights.push({ id: "wearable-behavioral-low", insight: "Both wearable data and behavioral patterns suggest reduced activity and engagement", contributingModalities: ["wearable", "behavioral"], confidence: 70, impact: "negative", actionable: true, suggestedAction: "Consider starting with small, enjoyable activities to rebuild momentum", fusionScore: 75 });
      }
    }

    // Symptom + Environmental
    const symptom = byModality.get("symptom");
    const environmental = byModality.get("environmental");
    if (symptom && environmental) {
      insights.push({ id: "symptom-env-context", insight: "Symptom patterns may have environmental correlates worth exploring", contributingModalities: ["symptom", "environmental"], confidence: 50, impact: "mixed", actionable: true, suggestedAction: "Track whether symptoms correlate with specific environments or times of day", fusionScore: 55 });
    }

    const overallCoherence = signals.length > 0 ? signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length : 0;

    return { timestamp: Date.now(), activeModalities: modalities, signalCount: signals.length, fusedInsights: insights, overallCoherence, dataCompleteness: completeness * 100 };
  }, []);

  return { fuseSignals };
}

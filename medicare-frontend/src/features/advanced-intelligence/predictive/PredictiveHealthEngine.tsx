/**
 * PredictiveHealthEngine — Core engine for health outcome prediction,
 * risk modeling, and preventive forecasting with uncertainty quantification
 * and emotionally safe probability communication.
 */
import { useCallback } from "react";

export interface HealthPrediction {
  id: string;
  condition: string;
  riskLevel: "very_low" | "low" | "moderate" | "elevated" | "high";
  probability: number;          // 0-1
  confidence: number;           // 0-100
  uncertaintyRange: [number, number]; // [low, high]
  timeHorizon: "days" | "weeks" | "months" | "years";
  timeEstimate: number;
  evidenceBasis: PredictionEvidence[];
  preventiveActions: PreventiveAction[];
  emotionalFraming: string;     // Safe, non-alarmist communication
  lastUpdated: number;
}

export interface PredictionEvidence {
  source: "symptoms" | "wearable" | "longitudinal" | "behavioral" | "demographic";
  description: string;
  weight: number;               // 0-1
  confidence: number;
  direction: "risk_increasing" | "risk_decreasing" | "neutral";
}

export interface PreventiveAction {
  action: string;
  impact: "high" | "moderate" | "low";
  effort: "easy" | "moderate" | "significant";
  timeToEffect: string;
  evidenceStrength: number;
}

export function usePredictiveHealthEngine() {
  const generatePrediction = useCallback((
    condition: string, evidence: PredictionEvidence[], baseRate: number = 0.1
  ): HealthPrediction => {
    // Bayesian-inspired risk computation
    let logOdds = Math.log(baseRate / (1 - baseRate));
    for (const e of evidence) {
      const modifier = e.direction === "risk_increasing" ? e.weight : e.direction === "risk_decreasing" ? -e.weight : 0;
      logOdds += modifier * e.confidence / 100;
    }
    const probability = 1 / (1 + Math.exp(-logOdds));
    const avgConfidence = evidence.length > 0 ? evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length : 30;
    const uncertaintyWidth = (1 - avgConfidence / 100) * 0.4;

    let riskLevel: HealthPrediction["riskLevel"] = "very_low";
    if (probability > 0.6) riskLevel = "high";
    else if (probability > 0.4) riskLevel = "elevated";
    else if (probability > 0.2) riskLevel = "moderate";
    else if (probability > 0.1) riskLevel = "low";

    return {
      id: `pred-${condition}-${Date.now()}`, condition, riskLevel, probability, confidence: avgConfidence,
      uncertaintyRange: [Math.max(0, probability - uncertaintyWidth), Math.min(1, probability + uncertaintyWidth)],
      timeHorizon: "months", timeEstimate: 6,
      evidenceBasis: evidence, preventiveActions: generatePreventiveActions(riskLevel),
      emotionalFraming: generateSafeFraming(riskLevel, condition, avgConfidence),
      lastUpdated: Date.now(),
    };
  }, []);

  const comparePredictions = useCallback((current: HealthPrediction, previous: HealthPrediction): {
    direction: "improving" | "stable" | "worsening"; changeNarrative: string;
  } => {
    const diff = current.probability - previous.probability;
    if (Math.abs(diff) < 0.05) return { direction: "stable", changeNarrative: `Your ${current.condition} risk outlook remains stable since our last assessment.` };
    if (diff < 0) return { direction: "improving", changeNarrative: `Your ${current.condition} risk has decreased — the steps you're taking appear to be helping.` };
    return { direction: "worsening", changeNarrative: `Your ${current.condition} risk has shifted slightly upward. This doesn't mean something is wrong — it's an opportunity to review preventive strategies.` };
  }, []);

  return { generatePrediction, comparePredictions };
}

function generatePreventiveActions(risk: HealthPrediction["riskLevel"]): PreventiveAction[] {
  const actions: PreventiveAction[] = [
    { action: "Maintain regular physical activity", impact: "high", effort: "moderate", timeToEffect: "2-4 weeks", evidenceStrength: 85 },
    { action: "Monitor key health indicators", impact: "moderate", effort: "easy", timeToEffect: "Ongoing", evidenceStrength: 75 },
  ];
  if (risk === "elevated" || risk === "high") {
    actions.push(
      { action: "Consider scheduling a clinical consultation", impact: "high", effort: "moderate", timeToEffect: "1-2 weeks", evidenceStrength: 90 },
      { action: "Review and optimize medication adherence", impact: "high", effort: "easy", timeToEffect: "1-4 weeks", evidenceStrength: 80 }
    );
  }
  return actions;
}

function generateSafeFraming(risk: HealthPrediction["riskLevel"], condition: string, confidence: number): string {
  if (confidence < 40) return `We're still gathering information about your ${condition} risk. Early signals suggest monitoring would be beneficial, but our confidence is limited.`;
  if (risk === "very_low" || risk === "low") return `Based on current evidence, your ${condition} risk appears low. Continuing your current health practices is encouraged.`;
  if (risk === "moderate") return `Some indicators suggest a moderate ${condition} risk profile. This is informational — not a diagnosis. Preventive steps can meaningfully reduce this.`;
  return `Elevated indicators for ${condition} risk have been detected. This reflects patterns, not certainties. We recommend discussing preventive strategies with a healthcare provider.`;
}

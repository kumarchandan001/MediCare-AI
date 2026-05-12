/**
 * CrossSystemReasoningEngine — Reasoning engine that considers all health
 * domains simultaneously. Produces CrossSystemInsight[] explaining how
 * domains interact (e.g., "Poor sleep may be amplifying fatigue symptoms").
 * 
 * This ensures health reasoning feels INTERCONNECTED, not modular and isolated.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain, CrossDomainInsight } from "../UnifiedHealthEngine";

export interface ReasoningContext {
  signals: Map<HealthDomain, DomainSignal>;
  activeInvestigation?: {
    primaryCondition: string;
    confidence: number;
    symptoms: string[];
  };
  recentEvents: { domain: HealthDomain; event: string; timestamp: number }[];
}

export interface CrossSystemReasoning {
  insights: CrossDomainInsight[];
  riskAmplifiers: RiskAmplifier[];
  protectiveFactors: ProtectiveFactor[];
  overallAssessment: string;
  recommendedFocus: HealthDomain[];
}

export interface RiskAmplifier {
  sourceDomains: HealthDomain[];
  description: string;
  amplificationFactor: number; // 1.0 = no effect, >1 = amplifying risk
  mitigationSuggestion: string;
}

export interface ProtectiveFactor {
  sourceDomains: HealthDomain[];
  description: string;
  protectionScore: number; // 0-100
}

export function useCrossSystemReasoning() {
  const reason = useCallback((context: ReasoningContext): CrossSystemReasoning => {
    const { signals } = context;
    const insights: CrossDomainInsight[] = [];
    const riskAmplifiers: RiskAmplifier[] = [];
    const protectiveFactors: ProtectiveFactor[] = [];
    const recommendedFocus: HealthDomain[] = [];

    const get = (d: HealthDomain) => signals.get(d);

    // ═══ 1. Sleep-Disease Interaction ═══
    const sleep = get("sleep");
    const disease = get("disease_intelligence");
    if (sleep && disease && context.activeInvestigation) {
      if (sleep.score < 40) {
        riskAmplifiers.push({
          sourceDomains: ["sleep", "disease_intelligence"],
          description: "Sleep deprivation may be amplifying symptom perception and reducing immune resilience.",
          amplificationFactor: 1.3,
          mitigationSuggestion: "Prioritize 7-8 hours of quality sleep to support your body's natural defenses.",
        });
        insights.push({
          id: `csr-sleep-disease-${Date.now()}`,
          sourceDomains: ["sleep", "disease_intelligence"],
          insight: `Your recent sleep quality (${sleep.score}/100) may be influencing how you experience your symptoms. Poor sleep can make symptoms feel more intense.`,
          impact: "negative",
          confidence: 65,
          actionSuggestion: "Consider improving sleep conditions — this may help moderate symptom severity.",
        });
      }
      if (sleep.score > 75) {
        protectiveFactors.push({
          sourceDomains: ["sleep", "disease_intelligence"],
          description: "Good sleep quality is supporting immune function and symptom management.",
          protectionScore: 70,
        });
      }
    }

    // ═══ 2. Stress-Symptom Severity ═══
    const emotional = get("emotional");
    if (emotional && disease && emotional.score < 40) {
      riskAmplifiers.push({
        sourceDomains: ["emotional", "disease_intelligence"],
        description: "Elevated stress levels may be intensifying symptom perception and slowing recovery.",
        amplificationFactor: 1.25,
        mitigationSuggestion: "Stress management techniques like deep breathing or short walks may help reduce symptom intensity.",
      });
      recommendedFocus.push("emotional");
    }

    // ═══ 3. Activity-Escalation Interpretation ═══
    const activity = get("activity");
    if (activity && disease && context.activeInvestigation) {
      if (activity.score > 85 && context.activeInvestigation.confidence > 60) {
        insights.push({
          id: `csr-activity-context-${Date.now()}`,
          sourceDomains: ["activity", "disease_intelligence"],
          insight: "Your high activity level suggests good functional capacity, which provides additional context for your symptom assessment.",
          impact: "positive",
          confidence: 60,
        });
      }
      if (activity.score < 30 && activity.trend === "declining") {
        riskAmplifiers.push({
          sourceDomains: ["activity", "disease_intelligence"],
          description: "Declining activity may indicate symptom burden affecting daily function.",
          amplificationFactor: 1.15,
          mitigationSuggestion: "Gentle movement, even short walks, can support both physical and mental wellbeing.",
        });
      }
    }

    // ═══ 4. Medication-Recovery ═══
    const medication = get("medication");
    const recovery = get("recovery");
    if (medication && recovery) {
      if (medication.score < 50 && recovery.trend === "declining") {
        insights.push({
          id: `csr-med-recovery-${Date.now()}`,
          sourceDomains: ["medication", "recovery"],
          insight: "Inconsistent medication adherence appears to correlate with slower recovery progress.",
          impact: "negative",
          confidence: 55,
          actionSuggestion: "Setting regular medication reminders may help support steady recovery.",
        });
        recommendedFocus.push("medication");
      }
      if (medication.score > 80 && recovery.trend === "improving") {
        protectiveFactors.push({
          sourceDomains: ["medication", "recovery"],
          description: "Consistent medication adherence is supporting positive recovery trajectory.",
          protectionScore: 75,
        });
      }
    }

    // ═══ 5. Wearable-Activity Validation ═══
    const wearable = get("wearable");
    if (wearable && activity) {
      if (wearable.confidence > 70 && Math.abs(wearable.score - activity.score) > 30) {
        insights.push({
          id: `csr-wearable-activity-${Date.now()}`,
          sourceDomains: ["wearable", "activity"],
          insight: "There's a discrepancy between your wearable data and reported activity — this may warrant attention.",
          impact: "neutral",
          confidence: 50,
        });
      }
    }

    // ═══ 6. Nutrition-Fatigue ═══
    const nutrition = get("nutrition");
    if (nutrition && sleep && nutrition.score < 40 && sleep.score < 50) {
      insights.push({
        id: `csr-nutrition-fatigue-${Date.now()}`,
        sourceDomains: ["nutrition", "sleep"],
        insight: "Both nutrition and sleep quality are below optimal — this combination often contributes to persistent fatigue.",
        impact: "negative",
        confidence: 60,
        actionSuggestion: "Small improvements in both diet and sleep routines can compound into significant energy improvements.",
      });
    }

    // ═══ Build Overall Assessment ═══
    const ampCount = riskAmplifiers.length;
    const protCount = protectiveFactors.length;
    let overallAssessment: string;

    if (ampCount === 0 && protCount > 0) {
      overallAssessment = "Your health systems are working well together. Several protective factors are actively supporting your wellbeing.";
    } else if (ampCount > protCount) {
      overallAssessment = `There are ${ampCount} area${ampCount > 1 ? "s" : ""} where your health systems are interacting in ways that may need attention. Small targeted improvements could make a meaningful difference.`;
    } else if (ampCount > 0 && protCount > 0) {
      overallAssessment = "Your health picture is mixed — some systems are supporting each other well, while others could benefit from attention.";
    } else {
      overallAssessment = "Your health systems are in a neutral state. As more data comes in, we'll identify specific interactions.";
    }

    return {
      insights,
      riskAmplifiers,
      protectiveFactors,
      overallAssessment,
      recommendedFocus: [...new Set(recommendedFocus)],
    };
  }, []);

  return { reason };
}

/**
 * ChronicRiskEvolution — Tracks chronic risk factor evolution over time.
 * Monitors sustained patterns like persistent hypertension indicators,
 * glucose trends, cardiovascular risk markers from wearable data, and
 * recurring condition patterns.
 */
import { useCallback } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";

export interface ChronicRiskFactor {
  id: string;
  name: string;
  category: "cardiovascular" | "metabolic" | "respiratory" | "musculoskeletal" |
    "neurological" | "immune" | "behavioral" | "general";
  currentLevel: number;       // 0-100
  baselineLevel: number;      // 0-100
  trend: "increasing" | "stable" | "decreasing" | "fluctuating";
  trendDurationWeeks: number;
  contributingDomains: HealthDomain[];
  narrative: string;
  monitoringRecommendation: string;
}

export interface ChronicRiskProfile {
  riskFactors: ChronicRiskFactor[];
  overallChronicRisk: number;     // 0-100
  riskTrajectory: "improving" | "stable" | "worsening" | "insufficient_data";
  yearsOfDataNeeded: number;
  narrative: string;
  longTermSuggestions: string[];
}

export function useChronicRiskEvolution() {
  const evaluate = useCallback((
    historicalData: {
      domain: HealthDomain;
      weeklyScores: { week: number; score: number }[];
    }[],
    investigationHistory?: { condition: string; date: number; severity: number }[]
  ): ChronicRiskProfile => {
    const riskFactors: ChronicRiskFactor[] = [];
    const longTermSuggestions: string[] = [];

    // ── Analyze each domain for chronic patterns ──
    for (const data of historicalData) {
      if (data.weeklyScores.length < 4) continue;

      const scores = data.weeklyScores.map(w => w.score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const recent = scores.slice(-4);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlier = scores.slice(0, 4);
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

      // Detect sustained low patterns
      const sustainedLow = recentAvg < 40 && avg < 45;
      const worsening = recentAvg < earlierAvg - 10;
      const improving = recentAvg > earlierAvg + 10;

      if (sustainedLow || worsening) {
        const factor = buildRiskFactor(data.domain, scores, recentAvg, earlierAvg);
        if (factor) riskFactors.push(factor);
      }
    }

    // ── Analyze recurring conditions ──
    if (investigationHistory && investigationHistory.length >= 2) {
      const conditionCounts = new Map<string, number>();
      for (const inv of investigationHistory) {
        conditionCounts.set(inv.condition, (conditionCounts.get(inv.condition) || 0) + 1);
      }

      for (const [condition, count] of conditionCounts) {
        if (count >= 3) {
          riskFactors.push({
            id: `chronic-recurrence-${condition}`,
            name: `Recurring ${condition}`,
            category: "general",
            currentLevel: Math.min(100, count * 20),
            baselineLevel: 20,
            trend: "increasing",
            trendDurationWeeks: 12,
            contributingDomains: ["disease_intelligence", "recovery"],
            narrative: `${condition} has recurred ${count} times, suggesting an underlying pattern worth investigating with a healthcare provider.`,
            monitoringRecommendation: "Track symptoms between episodes and note any triggers or seasonal patterns.",
          });
        }
      }
    }

    // ── Overall chronic risk ──
    const overallChronicRisk = riskFactors.length === 0
      ? 10
      : Math.min(100, Math.round(riskFactors.reduce((s, f) => s + f.currentLevel, 0) / riskFactors.length));

    const worsening = riskFactors.filter(f => f.trend === "increasing").length;
    const improving = riskFactors.filter(f => f.trend === "decreasing").length;

    let riskTrajectory: ChronicRiskProfile["riskTrajectory"];
    if (riskFactors.length === 0) riskTrajectory = "insufficient_data";
    else if (improving > worsening) riskTrajectory = "improving";
    else if (worsening > improving) riskTrajectory = "worsening";
    else riskTrajectory = "stable";

    // ── Suggestions ──
    if (riskFactors.some(f => f.category === "cardiovascular")) {
      longTermSuggestions.push("Maintain regular cardiovascular exercise — even moderate walking helps.");
    }
    if (riskFactors.some(f => f.category === "behavioral")) {
      longTermSuggestions.push("Lifestyle consistency is the most powerful long-term health strategy.");
    }
    longTermSuggestions.push("Regular health check-ups help catch chronic changes early.");
    longTermSuggestions.push("Share your longitudinal health data with your healthcare provider for informed discussions.");

    // ── Narrative ──
    let narrative: string;
    if (riskFactors.length === 0) {
      narrative = "No chronic risk patterns detected. Continue building your health data for deeper long-term insights.";
    } else if (riskTrajectory === "improving") {
      narrative = "Some chronic risk factors are present, but the trend is encouraging — your health choices are making a difference.";
    } else if (riskTrajectory === "worsening") {
      narrative = "Some chronic risk indicators are trending upward. Long-term health is built on sustained daily choices — small consistent changes can reverse these trends.";
    } else {
      narrative = `We're tracking ${riskFactors.length} chronic risk factor${riskFactors.length > 1 ? "s" : ""}. Monitoring these over time helps us provide more meaningful guidance.`;
    }

    return {
      riskFactors, overallChronicRisk, riskTrajectory,
      yearsOfDataNeeded: Math.max(0, 1 - (historicalData.length > 0 ? historicalData[0].weeklyScores.length / 52 : 0)),
      narrative, longTermSuggestions,
    };
  }, []);

  return { evaluate };
}

function buildRiskFactor(
  domain: HealthDomain, scores: number[], recentAvg: number, earlierAvg: number
): ChronicRiskFactor | null {
  const config: Record<string, { name: string; category: ChronicRiskFactor["category"]; monitoring: string }> = {
    sleep: { name: "Chronic Sleep Deficit", category: "behavioral", monitoring: "Track sleep patterns and aim for 7-8 hours consistently." },
    activity: { name: "Chronic Inactivity", category: "cardiovascular", monitoring: "Monitor daily step counts and aim for gradual increases." },
    emotional: { name: "Chronic Stress", category: "neurological", monitoring: "Regular stress check-ins and relaxation practice." },
    nutrition: { name: "Sustained Poor Nutrition", category: "metabolic", monitoring: "Track meal regularity and nutritional balance." },
    recovery: { name: "Impaired Recovery Pattern", category: "immune", monitoring: "Monitor recovery timelines and discuss with your doctor." },
    wellness: { name: "Declining Overall Wellness", category: "general", monitoring: "Regular wellness self-assessment and lifestyle review." },
  };

  const cfg = config[domain];
  if (!cfg) return null;

  const declining = recentAvg < earlierAvg - 5;
  const improving = recentAvg > earlierAvg + 5;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - recentAvg, 2), 0) / scores.length;

  return {
    id: `chronic-${domain}-${Date.now()}`,
    name: cfg.name,
    category: cfg.category,
    currentLevel: Math.round(100 - recentAvg),
    baselineLevel: Math.round(100 - earlierAvg),
    trend: declining ? "increasing" : improving ? "decreasing" : variance > 200 ? "fluctuating" : "stable",
    trendDurationWeeks: scores.length,
    contributingDomains: [domain],
    narrative: `${cfg.name} has been present for ${scores.length} weeks. Current risk level: ${Math.round(100 - recentAvg)}/100.`,
    monitoringRecommendation: cfg.monitoring,
  };
}

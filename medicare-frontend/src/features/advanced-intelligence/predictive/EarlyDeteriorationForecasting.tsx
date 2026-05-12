/**
 * EarlyDeteriorationForecasting — Detects early signs of health
 * deterioration from longitudinal trends before they become clinically
 * significant, with uncertainty-honest forecasting.
 */
import { useCallback } from "react";

export interface DeteriorationSignal {
  domain: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  trendDirection: "declining" | "accelerating_decline" | "stable" | "improving";
  deteriorationRate: number;  // % change per day
  daysUntilConcern: number | null;
  confidence: number;
  alertLevel: "watch" | "attention" | "concern" | "urgent";
}

export interface DeteriorationForecast {
  overallRisk: "low" | "moderate" | "elevated" | "high";
  signals: DeteriorationSignal[];
  compoundRiskFactors: string[];
  narrative: string;
  recommendedActions: string[];
  forecastHorizonDays: number;
  lastAssessed: number;
}

export function useEarlyDeteriorationForecasting() {
  const analyzeTrajectory = useCallback((dataPoints: { timestamp: number; value: number }[], baseline: number): {
    trend: DeteriorationSignal["trendDirection"]; ratePerDay: number; projectedDaysToThreshold: number | null;
  } => {
    if (dataPoints.length < 3) return { trend: "stable", ratePerDay: 0, projectedDaysToThreshold: null };
    const sorted = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp);
    const daySpan = (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 86400000;
    if (daySpan < 1) return { trend: "stable", ratePerDay: 0, projectedDaysToThreshold: null };
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const avgFirst = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length;
    const ratePerDay = ((avgSecond - avgFirst) / baseline) / (daySpan / 2) * 100;
    let trend: DeteriorationSignal["trendDirection"] = "stable";
    if (ratePerDay < -2) trend = "accelerating_decline";
    else if (ratePerDay < -0.5) trend = "declining";
    else if (ratePerDay > 0.5) trend = "improving";
    const threshold = baseline * 0.7;
    const current = sorted[sorted.length - 1].value;
    const projectedDays = ratePerDay < 0 ? Math.abs((current - threshold) / (baseline * ratePerDay / 100)) : null;
    return { trend, ratePerDay, projectedDaysToThreshold: projectedDays ? Math.round(projectedDays) : null };
  }, []);

  const generateForecast = useCallback((signals: DeteriorationSignal[]): DeteriorationForecast => {
    const concerning = signals.filter(s => s.alertLevel === "concern" || s.alertLevel === "urgent");
    const attention = signals.filter(s => s.alertLevel === "attention");
    let overallRisk: DeteriorationForecast["overallRisk"] = "low";
    if (concerning.length >= 2) overallRisk = "high";
    else if (concerning.length >= 1) overallRisk = "elevated";
    else if (attention.length >= 2) overallRisk = "moderate";
    const compoundRisks = concerning.length >= 2 ? [`Multiple declining indicators (${concerning.map(s => s.domain).join(", ")}) may be compounding`] : [];
    const actions: string[] = [];
    if (overallRisk === "high") actions.push("We recommend consulting with a healthcare provider about these trends");
    if (concerning.some(s => s.domain === "sleep")) actions.push("Sleep quality trends suggest reviewing your sleep environment and routine");
    if (concerning.some(s => s.domain === "activity")) actions.push("Activity levels have been declining — even light activity can help reverse this trend");
    actions.push("Continue monitoring — early awareness is the most powerful preventive tool");
    return {
      overallRisk, signals, compoundRiskFactors: compoundRisks,
      narrative: generateDeteriorationNarrative(overallRisk, signals.length, concerning.length),
      recommendedActions: actions, forecastHorizonDays: 30, lastAssessed: Date.now(),
    };
  }, []);

  return { analyzeTrajectory, generateForecast };
}

function generateDeteriorationNarrative(risk: string, totalSignals: number, concerningCount: number): string {
  if (risk === "low") return `Across ${totalSignals} health dimensions, your trajectories look stable. No early warning signals detected.`;
  if (risk === "moderate") return `Most of your health indicators are stable, but a few deserve attention. Early awareness gives you the opportunity to adjust.`;
  if (risk === "elevated") return `We've noticed some declining trends that are worth watching. This is early — and early is when preventive action is most effective.`;
  return `Several health indicators are showing declining trajectories (${concerningCount} areas). We strongly recommend discussing these patterns with a healthcare provider.`;
}

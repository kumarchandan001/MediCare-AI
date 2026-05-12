/**
 * LongitudinalForecastingLayer — Multi-horizon health forecasting
 * combining longitudinal history with adaptive confidence windows.
 */
import { useCallback } from "react";

export interface LongitudinalForecast {
  metric: string;
  currentValue: number;
  forecasts: ForecastPoint[];
  confidenceBand: { upper: number[]; lower: number[] };
  modelConfidence: number;
  dataPoints: number;
  narrative: string;
}

export interface ForecastPoint {
  daysAhead: number;
  predictedValue: number;
  confidenceInterval: [number, number];
  reliability: "high" | "moderate" | "low" | "speculative";
}

export function useLongitudinalForecastingLayer() {
  const generateForecast = useCallback((
    metric: string, history: { timestamp: number; value: number }[], horizonDays: number[] = [7, 14, 30, 90]
  ): LongitudinalForecast => {
    if (history.length < 5) {
      return {
        metric, currentValue: history[history.length - 1]?.value || 0,
        forecasts: horizonDays.map(d => ({ daysAhead: d, predictedValue: history[history.length - 1]?.value || 0, confidenceInterval: [0, 100] as [number, number], reliability: "speculative" as const })),
        confidenceBand: { upper: [], lower: [] }, modelConfidence: 10, dataPoints: history.length,
        narrative: `Insufficient data for reliable ${metric} forecasting. Continue tracking for better predictions.`,
      };
    }
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    const current = sorted[sorted.length - 1].value;
    const values = sorted.map(p => p.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    // Simple linear trend
    const n = values.length;
    const xMean = (n - 1) / 2;
    const slope = values.reduce((s, v, i) => s + (i - xMean) * (v - mean), 0) / values.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    const daysBetweenPoints = n > 1 ? (sorted[n - 1].timestamp - sorted[0].timestamp) / (n - 1) / 86400000 : 1;
    const slopePerDay = slope / daysBetweenPoints;
    const modelConfidence = Math.min(90, Math.max(20, 30 + n * 2 - std / mean * 50));

    const forecasts: ForecastPoint[] = horizonDays.map(d => {
      const predicted = current + slopePerDay * d;
      const uncertainty = std * Math.sqrt(1 + d / 30) * (1 + (100 - modelConfidence) / 100);
      const reliability = d <= 7 ? "high" as const : d <= 30 ? "moderate" as const : d <= 90 ? "low" as const : "speculative" as const;
      return { daysAhead: d, predictedValue: Math.max(0, predicted), confidenceInterval: [Math.max(0, predicted - uncertainty), predicted + uncertainty] as [number, number], reliability };
    });

    return {
      metric, currentValue: current, forecasts,
      confidenceBand: { upper: forecasts.map(f => f.confidenceInterval[1]), lower: forecasts.map(f => f.confidenceInterval[0]) },
      modelConfidence, dataPoints: n,
      narrative: generateForecastNarrative(metric, slopePerDay, modelConfidence),
    };
  }, []);

  return { generateForecast };
}

function generateForecastNarrative(metric: string, slopePerDay: number, confidence: number): string {
  const direction = slopePerDay > 0.1 ? "upward" : slopePerDay < -0.1 ? "downward" : "stable";
  const reliability = confidence > 70 ? "Our model has good confidence" : confidence > 40 ? "This forecast has moderate confidence" : "This is a preliminary estimate";
  return `${reliability} in the ${metric} trajectory. Current trend is ${direction}. Longer data history will improve forecast accuracy.`;
}

/**
 * PredictiveValidationFramework — Validates predictive models against
 * actual outcomes with calibration analysis and accuracy tracking.
 */
import { useCallback, useRef } from "react";

export interface PredictionOutcomePair {
  predictionId: string;
  predictedProbability: number;
  actualOutcome: boolean;
  domain: string;
  timestamp: number;
}

export interface ValidationMetrics {
  accuracy: number;
  calibrationError: number;
  brierScore: number;
  auroc: number | null;
  totalPredictions: number;
  overconfidenceRate: number;
  underconfidenceRate: number;
}

export function usePredictiveValidationFramework() {
  const pairs = useRef<PredictionOutcomePair[]>([]);

  const recordOutcome = useCallback((pair: PredictionOutcomePair): void => {
    pairs.current = [...pairs.current.slice(-999), pair];
  }, []);

  const validate = useCallback((): ValidationMetrics => {
    const all = pairs.current;
    if (all.length < 10) return { accuracy: 0, calibrationError: 0, brierScore: 0, auroc: null, totalPredictions: all.length, overconfidenceRate: 0, underconfidenceRate: 0 };
    // Brier score
    const brierScore = all.reduce((s, p) => s + (p.predictedProbability - (p.actualOutcome ? 1 : 0)) ** 2, 0) / all.length;
    // Accuracy at 0.5 threshold
    const correct = all.filter(p => (p.predictedProbability >= 0.5) === p.actualOutcome).length;
    const accuracy = correct / all.length;
    // Calibration: bin predictions and compare to actual rates
    const bins = Array.from({ length: 10 }, (_, i) => {
      const lo = i * 0.1, hi = (i + 1) * 0.1;
      const inBin = all.filter(p => p.predictedProbability >= lo && p.predictedProbability < hi);
      const predicted = (lo + hi) / 2;
      const actual = inBin.length > 0 ? inBin.filter(p => p.actualOutcome).length / inBin.length : predicted;
      return { predicted, actual, count: inBin.length };
    }).filter(b => b.count > 0);
    const calibrationError = bins.length > 0 ? bins.reduce((s, b) => s + Math.abs(b.predicted - b.actual) * b.count, 0) / all.length : 0;
    const overconfident = all.filter(p => p.predictedProbability > 0.7 && !p.actualOutcome).length;
    const underconfident = all.filter(p => p.predictedProbability < 0.3 && p.actualOutcome).length;
    return { accuracy, calibrationError, brierScore, auroc: null, totalPredictions: all.length, overconfidenceRate: all.length > 0 ? overconfident / all.length : 0, underconfidenceRate: all.length > 0 ? underconfident / all.length : 0 };
  }, []);

  return { recordOutcome, validate };
}

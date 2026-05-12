/**
 * LongitudinalValidationManager — Tracks benchmark scores over time (weeks/months)
 * to ensure that updates to the reasoning engine do not cause regressions
 * (model degradation) in previously validated clinical scenarios.
 */
import { useClinicalValidationEngine, type ValidationSuiteResults } from "../engine/ClinicalValidationEngine";

export function useLongitudinalValidationManager() {
  const { history } = useClinicalValidationEngine();

  const analyzeDegradation = (category: string) => {
    // Check if the most recent score for a category is significantly lower than the historical average
    const categoryScores = history
      .flatMap(suite => suite.benchmarkResults)
      .filter(res => res.category === category)
      .map(res => res.score);

    if (categoryScores.length < 2) return { degraded: false, drop: 0 };

    const recent = categoryScores[0];
    const historicalAvg = categoryScores.slice(1).reduce((a, b) => a + b, 0) / (categoryScores.length - 1);

    return {
      degraded: recent < historicalAvg - 10,
      drop: historicalAvg - recent,
      historicalAvg,
      recent
    };
  };

  return {
    history,
    analyzeDegradation
  };
}

/**
 * ValidationResearchCoordinator — Compiles validation reports and findings
 * into structured formats (like JSON or CSV arrays) that can be easily exported
 * for external clinical review boards or research studies.
 */
import { useClinicalValidationEngine } from "../engine/ClinicalValidationEngine";

export function useValidationResearchCoordinator() {
  const { history } = useClinicalValidationEngine();

  const exportForReview = () => {
    return history.map(suite => ({
      suite_id: suite.suiteId,
      date_run: new Date(suite.timestamp).toISOString(),
      consistency_score: suite.overallConsistencyScore,
      critical_failures: suite.criticalFailures,
      scenarios_run: suite.benchmarkResults.map(res => ({
        id: res.scenarioId,
        category: res.category,
        passed: res.passed,
        ai_explanation: res.explanation
      }))
    }));
  };

  return { exportForReview };
}

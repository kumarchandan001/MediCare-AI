/**
 * ClinicalValidationEngine — The core orchestrator for evaluating the AI's
 * clinical reasoning, escalation logic, and longitudinal stability. It manages
 * the execution of various benchmark suites and aggregates consistency scores.
 */
import { useCallback, useState } from "react";
import type { BenchmarkResult } from "../benchmarks/ReasoningBenchmarkFramework";

export interface ValidationSuiteResults {
  suiteId: string;
  timestamp: number;
  overallConsistencyScore: number;
  safetyScore: number;
  benchmarkResults: BenchmarkResult[];
  criticalFailures: number;
}

export function useClinicalValidationEngine() {
  const [history, setHistory] = useState<ValidationSuiteResults[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runFullSuite = useCallback(async (
    suitesToRun: (() => Promise<BenchmarkResult[]>)[]
  ) => {
    setIsRunning(true);
    try {
      const results: BenchmarkResult[] = [];
      
      // Execute each benchmark suite sequentially
      for (const suite of suitesToRun) {
        const suiteResults = await suite();
        results.push(...suiteResults);
      }

      // Calculate aggregate scores
      const totalScore = results.reduce((acc, r) => acc + r.score, 0);
      const avgConsistency = results.length > 0 ? totalScore / results.length : 0;
      
      const safetyResults = results.filter(r => r.category === "safety");
      const safetyScore = safetyResults.length > 0 
        ? safetyResults.reduce((acc, r) => acc + r.score, 0) / safetyResults.length 
        : avgConsistency;

      const criticalFailures = results.filter(r => r.passed === false && r.category === "safety").length;

      const suiteRecord: ValidationSuiteResults = {
        suiteId: `val-${Date.now()}`,
        timestamp: Date.now(),
        overallConsistencyScore: avgConsistency,
        safetyScore,
        benchmarkResults: results,
        criticalFailures,
      };

      setHistory(prev => [suiteRecord, ...prev]);
      return suiteRecord;

    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    history,
    isRunning,
    runFullSuite,
    latestResult: history[0] || null,
  };
}

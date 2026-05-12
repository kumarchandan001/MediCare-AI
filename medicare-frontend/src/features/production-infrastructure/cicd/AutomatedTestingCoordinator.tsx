/**
 * AutomatedTestingCoordinator — Orchestrates automated test suites,
 * tracks test health, and manages test execution strategies.
 */
import { useCallback, useRef } from "react";

export interface TestSuite {
  id: string;
  name: string;
  type: "unit" | "integration" | "e2e" | "performance" | "security";
  tests: TestCase[];
  lastRun: TestRunResult | null;
}

export interface TestCase {
  id: string;
  name: string;
  file: string;
  tags: string[];
  flaky: boolean;
  avgDurationMs: number;
}

export interface TestRunResult {
  suiteId: string;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  timestamp: number;
  coverage: number | null;
  failures: { test: string; error: string; stackTrace: string }[];
}

export function useAutomatedTestingCoordinator() {
  const history = useRef<TestRunResult[]>([]);

  const analyzeTestHealth = useCallback((results: TestRunResult[]): {
    passRate: number; flakyRate: number; avgDuration: number;
    trending: "improving" | "stable" | "declining"; coverageTrend: "improving" | "stable" | "declining";
  } => {
    if (results.length === 0) return { passRate: 100, flakyRate: 0, avgDuration: 0, trending: "stable", coverageTrend: "stable" };
    const total = results.reduce((s, r) => s + r.passed + r.failed + r.skipped, 0);
    const passed = results.reduce((s, r) => s + r.passed, 0);
    const flaky = results.reduce((s, r) => s + r.flaky, 0);
    const passRate = total > 0 ? (passed / total) * 100 : 100;
    const flakyRate = total > 0 ? (flaky / total) * 100 : 0;
    const avgDuration = results.reduce((s, r) => s + r.duration, 0) / results.length;
    const firstHalf = results.slice(0, Math.floor(results.length / 2));
    const secondHalf = results.slice(Math.floor(results.length / 2));
    const avgPassFirst = firstHalf.reduce((s, r) => s + r.passed, 0) / (firstHalf.length || 1);
    const avgPassSecond = secondHalf.reduce((s, r) => s + r.passed, 0) / (secondHalf.length || 1);
    const trending = avgPassSecond > avgPassFirst * 1.05 ? "improving" as const : avgPassSecond < avgPassFirst * 0.95 ? "declining" as const : "stable" as const;
    const covFirst = firstHalf.filter(r => r.coverage !== null);
    const covSecond = secondHalf.filter(r => r.coverage !== null);
    const avgCovFirst = covFirst.length > 0 ? covFirst.reduce((s, r) => s + (r.coverage || 0), 0) / covFirst.length : 0;
    const avgCovSecond = covSecond.length > 0 ? covSecond.reduce((s, r) => s + (r.coverage || 0), 0) / covSecond.length : 0;
    const coverageTrend = avgCovSecond > avgCovFirst + 2 ? "improving" as const : avgCovSecond < avgCovFirst - 2 ? "declining" as const : "stable" as const;
    return { passRate, flakyRate, avgDuration, trending, coverageTrend };
  }, []);

  const identifyFlakyTests = useCallback((results: TestRunResult[]): string[] => {
    const failureCounts: Record<string, number> = {};
    results.forEach(r => r.failures.forEach(f => { failureCounts[f.test] = (failureCounts[f.test] || 0) + 1; }));
    return Object.entries(failureCounts).filter(([, count]) => count >= 2 && count < results.length * 0.8).map(([test]) => test);
  }, []);

  const recordRun = useCallback((result: TestRunResult): void => {
    history.current = [...history.current.slice(-99), result];
  }, []);

  return { analyzeTestHealth, identifyFlakyTests, recordRun, getHistory: () => [...history.current] };
}

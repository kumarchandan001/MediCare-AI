/**
 * LongitudinalRestorationEngine — Restores longitudinal health memory
 * and history after data loss, corruption, or migration events.
 */
import { useCallback } from "react";

export interface RestorationPlan {
  id: string;
  scope: "full" | "partial" | "incremental";
  dataCategories: string[];
  estimatedRecords: number;
  estimatedDurationMs: number;
  integrityChecks: IntegrityCheck[];
  status: "planned" | "restoring" | "verifying" | "completed" | "failed";
}

export interface IntegrityCheck {
  category: string;
  expectedCount: number;
  actualCount: number;
  missingRecords: number;
  corruptedRecords: number;
  passed: boolean;
}

export function useLongitudinalRestorationEngine() {
  const assessIntegrity = useCallback((categories: { name: string; expected: number; actual: number; corrupted: number }[]): IntegrityCheck[] => {
    return categories.map(c => ({
      category: c.name, expectedCount: c.expected, actualCount: c.actual,
      missingRecords: Math.max(0, c.expected - c.actual),
      corruptedRecords: c.corrupted,
      passed: c.actual >= c.expected * 0.95 && c.corrupted === 0,
    }));
  }, []);

  const createRestorationPlan = useCallback((checks: IntegrityCheck[]): RestorationPlan => {
    const failed = checks.filter(c => !c.passed);
    const totalMissing = failed.reduce((s, c) => s + c.missingRecords, 0);
    return {
      id: `restore-${Date.now()}`,
      scope: failed.length === checks.length ? "full" : failed.length > 0 ? "partial" : "incremental",
      dataCategories: failed.map(c => c.category),
      estimatedRecords: totalMissing,
      estimatedDurationMs: totalMissing * 10,
      integrityChecks: checks,
      status: "planned",
    };
  }, []);

  const verifyRestoration = useCallback((plan: RestorationPlan, postChecks: IntegrityCheck[]): { success: boolean; remainingIssues: string[] } => {
    const issues = postChecks.filter(c => !c.passed).map(c => `${c.category}: ${c.missingRecords} missing, ${c.corruptedRecords} corrupted`);
    return { success: issues.length === 0, remainingIssues: issues };
  }, []);

  return { assessIntegrity, createRestorationPlan, verifyRestoration };
}

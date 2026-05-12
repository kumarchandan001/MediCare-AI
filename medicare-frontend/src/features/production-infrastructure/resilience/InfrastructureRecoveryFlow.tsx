/**
 * InfrastructureRecoveryFlow — Orchestrates end-to-end infrastructure
 * recovery including service restart, data reconciliation, and health verification.
 */
import { useCallback } from "react";
import type { RecoveryAction } from "../core/ProductionInfrastructureEngine";

export interface RecoveryFlow {
  id: string;
  trigger: "auto" | "manual" | "scheduled";
  status: "initiated" | "diagnosing" | "recovering" | "verifying" | "completed" | "failed";
  actions: RecoveryAction[];
  startedAt: number;
  completedAt: number | null;
  diagnostics: DiagnosticResult[];
  verificationPassed: boolean | null;
}

export interface DiagnosticResult {
  subsystem: string;
  check: string;
  passed: boolean;
  details: string;
  timestamp: number;
}

export function useInfrastructureRecoveryFlow() {
  const createRecoveryFlow = useCallback((actions: RecoveryAction[], trigger: RecoveryFlow["trigger"] = "auto"): RecoveryFlow => ({
    id: `recovery-${Date.now()}`, trigger, status: "initiated", actions,
    startedAt: Date.now(), completedAt: null, diagnostics: [], verificationPassed: null,
  }), []);

  const runDiagnostics = useCallback((subsystems: { name: string; healthy: boolean; details: string }[]): DiagnosticResult[] => {
    return subsystems.map(s => ({
      subsystem: s.name, check: "health_check", passed: s.healthy, details: s.details, timestamp: Date.now(),
    }));
  }, []);

  const advanceFlow = useCallback((flow: RecoveryFlow, diagnostics?: DiagnosticResult[]): RecoveryFlow => {
    const progression: Record<string, RecoveryFlow["status"]> = {
      initiated: "diagnosing", diagnosing: "recovering", recovering: "verifying", verifying: "completed",
    };
    const nextStatus = progression[flow.status] || flow.status;
    const allPassed = diagnostics ? diagnostics.every(d => d.passed) : null;
    return {
      ...flow, status: nextStatus,
      diagnostics: diagnostics ? [...flow.diagnostics, ...diagnostics] : flow.diagnostics,
      verificationPassed: nextStatus === "completed" ? allPassed : flow.verificationPassed,
      completedAt: nextStatus === "completed" ? Date.now() : null,
    };
  }, []);

  const shouldEscalate = useCallback((flow: RecoveryFlow): boolean => {
    const failedDiagnostics = flow.diagnostics.filter(d => !d.passed);
    return flow.status === "failed" || failedDiagnostics.length > flow.diagnostics.length * 0.5;
  }, []);

  return { createRecoveryFlow, runDiagnostics, advanceFlow, shouldEscalate };
}

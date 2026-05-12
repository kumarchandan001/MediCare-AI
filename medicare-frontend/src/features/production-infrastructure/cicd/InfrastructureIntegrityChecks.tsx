/**
 * InfrastructureIntegrityChecks — Continuous infrastructure integrity
 * verification including data consistency, service health, and config drift detection.
 */
import { useCallback } from "react";

export interface IntegrityReport {
  timestamp: number;
  overallHealthy: boolean;
  checks: IntegrityCheckResult[];
  configDrifts: ConfigDrift[];
  dataConsistencyScore: number;
}

export interface IntegrityCheckResult {
  name: string;
  category: "data" | "service" | "config" | "network" | "storage";
  healthy: boolean;
  details: string;
  lastVerified: number;
}

export interface ConfigDrift {
  key: string;
  expectedValue: string;
  actualValue: string;
  severity: "info" | "warning" | "critical";
  driftedAt: number;
}

export function useInfrastructureIntegrityChecks() {
  const runChecks = useCallback((checks: IntegrityCheckResult[], drifts: ConfigDrift[]): IntegrityReport => {
    const criticalDrifts = drifts.filter(d => d.severity === "critical");
    const failedChecks = checks.filter(c => !c.healthy);
    const totalChecks = checks.length || 1;
    return {
      timestamp: Date.now(),
      overallHealthy: failedChecks.length === 0 && criticalDrifts.length === 0,
      checks, configDrifts: drifts,
      dataConsistencyScore: Math.round(((totalChecks - failedChecks.length) / totalChecks) * 100),
    };
  }, []);

  const detectConfigDrift = useCallback((expected: Record<string, string>, actual: Record<string, string>): ConfigDrift[] => {
    const drifts: ConfigDrift[] = [];
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[key];
      if (actualValue !== expectedValue) {
        const critical = key.toLowerCase().includes("secret") || key.toLowerCase().includes("auth");
        drifts.push({ key, expectedValue, actualValue: actualValue || "[missing]", severity: critical ? "critical" : "warning", driftedAt: Date.now() });
      }
    }
    return drifts;
  }, []);

  return { runChecks, detectConfigDrift };
}

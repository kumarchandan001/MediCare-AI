/**
 * RollbackManagementLayer — Manages deployment rollbacks with version
 * tracking, canary analysis, and safe rollback execution.
 */
import { useCallback, useRef } from "react";

export interface DeployedVersion {
  version: string;
  deployedAt: number;
  environment: string;
  healthy: boolean;
  rollbackable: boolean;
  artifacts: string[];
  metrics: { errorRate: number; p99Latency: number; successRate: number };
}

export interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  targetVersion: string | null;
  severity: "none" | "caution" | "recommended" | "critical";
  automatable: boolean;
}

export function useRollbackManagementLayer() {
  const versions = useRef<DeployedVersion[]>([]);

  const registerVersion = useCallback((v: DeployedVersion): void => {
    versions.current = [...versions.current.slice(-19), v];
  }, []);

  const evaluateRollback = useCallback((current: DeployedVersion, thresholds = { maxErrorRate: 5, maxLatency: 2000 }): RollbackDecision => {
    const previous = versions.current.filter(v => v.version !== current.version && v.healthy && v.rollbackable).sort((a, b) => b.deployedAt - a.deployedAt)[0];
    if (current.metrics.errorRate > thresholds.maxErrorRate * 3) {
      return { shouldRollback: true, reason: `Critical error rate: ${current.metrics.errorRate.toFixed(1)}%`, targetVersion: previous?.version || null, severity: "critical", automatable: true };
    }
    if (current.metrics.errorRate > thresholds.maxErrorRate) {
      return { shouldRollback: true, reason: `Error rate ${current.metrics.errorRate.toFixed(1)}% exceeds threshold`, targetVersion: previous?.version || null, severity: "recommended", automatable: false };
    }
    if (current.metrics.p99Latency > thresholds.maxLatency) {
      return { shouldRollback: false, reason: `High latency (${current.metrics.p99Latency}ms) — monitor closely`, targetVersion: previous?.version || null, severity: "caution", automatable: false };
    }
    return { shouldRollback: false, reason: "Deployment healthy", targetVersion: null, severity: "none", automatable: false };
  }, []);

  const getRollbackTarget = useCallback((): DeployedVersion | null => {
    return versions.current.filter(v => v.healthy && v.rollbackable).sort((a, b) => b.deployedAt - a.deployedAt)[0] || null;
  }, []);

  return { registerVersion, evaluateRollback, getRollbackTarget, getVersions: () => [...versions.current] };
}

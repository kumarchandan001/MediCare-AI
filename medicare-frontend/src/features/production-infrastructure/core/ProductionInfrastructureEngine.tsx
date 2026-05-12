/**
 * ProductionInfrastructureEngine — Core engine managing production deployment
 * state, infrastructure health, operational readiness, and distributed
 * orchestration across all platform subsystems.
 *
 * This is the central nervous system of the production infrastructure layer.
 * It does NOT render UI — it coordinates infrastructure intelligence.
 */
import { useCallback, useRef } from "react";

// ── Infrastructure Health Types ──────────
export type InfrastructureStatus = "healthy" | "degraded" | "critical" | "unknown" | "initializing";
export type EnvironmentTier = "local" | "staging" | "production" | "research";

export interface InfrastructureHealthReport {
  status: InfrastructureStatus;
  environment: EnvironmentTier;
  uptime: number;
  lastHealthCheck: number;
  subsystems: SubsystemHealth[];
  overallScore: number;       // 0-100
  degradedSystems: string[];
  criticalAlerts: InfraAlert[];
}

export interface SubsystemHealth {
  name: string;
  status: InfrastructureStatus;
  latency: number;            // ms
  errorRate: number;           // 0-100%
  throughput: number;          // requests/sec
  lastChecked: number;
  metadata?: Record<string, unknown>;
}

export interface InfraAlert {
  id: string;
  severity: "info" | "warning" | "critical" | "fatal";
  subsystem: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  autoResolveEta?: number;
}

export interface InfrastructureConfig {
  environment: EnvironmentTier;
  healthCheckIntervalMs: number;
  degradationThreshold: number;     // score below which system is "degraded"
  criticalThreshold: number;        // score below which system is "critical"
  autoRecoveryEnabled: boolean;
  telemetryEnabled: boolean;
  maxRetries: number;
}

// ── Default Configuration ────────────────
const DEFAULT_CONFIG: InfrastructureConfig = {
  environment: "local",
  healthCheckIntervalMs: 30_000,
  degradationThreshold: 70,
  criticalThreshold: 40,
  autoRecoveryEnabled: true,
  telemetryEnabled: true,
  maxRetries: 3,
};

export function useProductionInfrastructureEngine(
  configOverrides?: Partial<InfrastructureConfig>
) {
  const config = useRef<InfrastructureConfig>({ ...DEFAULT_CONFIG, ...configOverrides });
  const startTime = useRef<number>(Date.now());

  /**
   * Evaluate all subsystem health signals and produce a unified report.
   */
  const evaluateHealth = useCallback((
    subsystems: SubsystemHealth[]
  ): InfrastructureHealthReport => {
    if (subsystems.length === 0) {
      return {
        status: "initializing",
        environment: config.current.environment,
        uptime: Date.now() - startTime.current,
        lastHealthCheck: Date.now(),
        subsystems: [],
        overallScore: 0,
        degradedSystems: [],
        criticalAlerts: [],
      };
    }

    // Score each subsystem
    const scores = subsystems.map(sub => {
      const latencyPenalty = Math.min(30, sub.latency / 100);
      const errorPenalty = sub.errorRate * 0.7;
      return Math.max(0, 100 - latencyPenalty - errorPenalty);
    });

    const overallScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length
    );

    const degradedSystems = subsystems
      .filter((_, i) => scores[i] < config.current.degradationThreshold)
      .map(s => s.name);

    const criticalAlerts: InfraAlert[] = subsystems
      .filter((_, i) => scores[i] < config.current.criticalThreshold)
      .map(sub => ({
        id: `critical-${sub.name}-${Date.now()}`,
        severity: "critical" as const,
        subsystem: sub.name,
        message: `Subsystem "${sub.name}" is critically degraded (error rate: ${sub.errorRate.toFixed(1)}%, latency: ${sub.latency}ms)`,
        timestamp: Date.now(),
        acknowledged: false,
      }));

    let status: InfrastructureStatus;
    if (overallScore >= config.current.degradationThreshold) status = "healthy";
    else if (overallScore >= config.current.criticalThreshold) status = "degraded";
    else status = "critical";

    return {
      status,
      environment: config.current.environment,
      uptime: Date.now() - startTime.current,
      lastHealthCheck: Date.now(),
      subsystems,
      overallScore,
      degradedSystems,
      criticalAlerts,
    };
  }, []);

  /**
   * Determine if auto-recovery should be triggered for a subsystem.
   */
  const shouldAutoRecover = useCallback((
    subsystem: SubsystemHealth
  ): boolean => {
    if (!config.current.autoRecoveryEnabled) return false;
    return subsystem.status === "critical" || subsystem.errorRate > 50;
  }, []);

  /**
   * Generate a recovery plan for degraded/critical subsystems.
   */
  const generateRecoveryPlan = useCallback((
    report: InfrastructureHealthReport
  ): RecoveryAction[] => {
    const actions: RecoveryAction[] = [];

    for (const sub of report.subsystems) {
      if (sub.status === "critical") {
        actions.push({
          subsystem: sub.name,
          action: "restart",
          priority: "immediate",
          reason: `Critical status detected — error rate ${sub.errorRate.toFixed(1)}%`,
          estimatedRecoveryMs: 5_000,
        });
      } else if (sub.status === "degraded") {
        actions.push({
          subsystem: sub.name,
          action: "scale",
          priority: "high",
          reason: `Degraded performance — latency ${sub.latency}ms`,
          estimatedRecoveryMs: 15_000,
        });
      }
    }

    return actions.sort((a, b) => {
      const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, []);

  /**
   * Update infrastructure configuration at runtime.
   */
  const updateConfig = useCallback((
    updates: Partial<InfrastructureConfig>
  ) => {
    config.current = { ...config.current, ...updates };
  }, []);

  return {
    evaluateHealth,
    shouldAutoRecover,
    generateRecoveryPlan,
    updateConfig,
    getConfig: () => config.current,
    getUptime: () => Date.now() - startTime.current,
  };
}

// ── Recovery Action Types ────────────────
export interface RecoveryAction {
  subsystem: string;
  action: "restart" | "scale" | "failover" | "throttle" | "bypass";
  priority: "immediate" | "high" | "medium" | "low";
  reason: string;
  estimatedRecoveryMs: number;
}

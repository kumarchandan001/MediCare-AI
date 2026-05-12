/**
 * OperationalStabilityCoordinator — Monitors cross-system stability,
 * detects cascading failures, and coordinates stabilization across
 * all production subsystems.
 */
import { useCallback, useRef } from "react";
import type { SubsystemHealth, InfrastructureStatus } from "./ProductionInfrastructureEngine";

export interface StabilitySnapshot {
  timestamp: number;
  overallStability: number;  // 0-100
  cascadeRisk: "none" | "low" | "medium" | "high" | "critical";
  subsystemCorrelations: SubsystemCorrelation[];
  recommendations: StabilityRecommendation[];
}

export interface SubsystemCorrelation {
  source: string;
  target: string;
  correlation: number;  // -1 to 1
  riskPropagation: number;  // 0-100
}

export interface StabilityRecommendation {
  subsystem: string;
  action: string;
  urgency: "low" | "medium" | "high" | "critical";
  reason: string;
}

export function useOperationalStabilityCoordinator() {
  const history = useRef<StabilitySnapshot[]>([]);

  const assessStability = useCallback((subsystems: SubsystemHealth[]): StabilitySnapshot => {
    const healthy = subsystems.filter(s => s.status === "healthy").length;
    const total = subsystems.length || 1;
    const overallStability = Math.round((healthy / total) * 100);

    // Detect cascade risk
    const degradedCount = subsystems.filter(s => s.status !== "healthy").length;
    let cascadeRisk: StabilitySnapshot["cascadeRisk"] = "none";
    if (degradedCount >= total * 0.6) cascadeRisk = "critical";
    else if (degradedCount >= total * 0.4) cascadeRisk = "high";
    else if (degradedCount >= total * 0.25) cascadeRisk = "medium";
    else if (degradedCount > 0) cascadeRisk = "low";

    // Compute pairwise correlations (simplified: co-degradation)
    const correlations: SubsystemCorrelation[] = [];
    for (let i = 0; i < subsystems.length; i++) {
      for (let j = i + 1; j < subsystems.length; j++) {
        const a = subsystems[i], b = subsystems[j];
        const bothDegraded = a.status !== "healthy" && b.status !== "healthy";
        correlations.push({
          source: a.name, target: b.name,
          correlation: bothDegraded ? 0.8 : a.status === b.status ? 0.3 : -0.1,
          riskPropagation: bothDegraded ? 75 : 10,
        });
      }
    }

    // Generate recommendations
    const recommendations: StabilityRecommendation[] = subsystems
      .filter(s => s.status !== "healthy")
      .map(s => ({
        subsystem: s.name,
        action: s.status === "critical" ? "Immediate restart required" : "Monitor and scale resources",
        urgency: s.status === "critical" ? "critical" as const : "high" as const,
        reason: `Error rate: ${s.errorRate.toFixed(1)}%, Latency: ${s.latency}ms`,
      }));

    const snapshot: StabilitySnapshot = {
      timestamp: Date.now(), overallStability, cascadeRisk,
      subsystemCorrelations: correlations, recommendations,
    };
    history.current = [...history.current.slice(-99), snapshot];
    return snapshot;
  }, []);

  const getStabilityTrend = useCallback((windowSize = 10): "improving" | "stable" | "declining" => {
    const recent = history.current.slice(-windowSize);
    if (recent.length < 2) return "stable";
    const first = recent.slice(0, Math.floor(recent.length / 2));
    const second = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = first.reduce((s, r) => s + r.overallStability, 0) / first.length;
    const avgSecond = second.reduce((s, r) => s + r.overallStability, 0) / second.length;
    if (avgSecond - avgFirst > 5) return "improving";
    if (avgFirst - avgSecond > 5) return "declining";
    return "stable";
  }, []);

  return { assessStability, getStabilityTrend, getHistory: () => [...history.current] };
}

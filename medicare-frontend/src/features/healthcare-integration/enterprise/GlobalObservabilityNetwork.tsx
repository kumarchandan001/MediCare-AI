/**
 * GlobalObservabilityNetwork — Provides global-scale observability
 * with distributed tracing, metric aggregation, and alert correlation.
 */
import { useCallback } from "react";

export interface ObservabilityRegion {
  region: string;
  status: "healthy" | "degraded" | "outage";
  metrics: { latencyP99: number; errorRate: number; throughput: number };
  activeAlerts: number;
  lastReport: number;
}

export function useGlobalObservabilityNetwork() {
  const assessGlobal = useCallback((regions: ObservabilityRegion[]): { globalHealth: number; affectedRegions: string[]; summary: string } => {
    const healthy = regions.filter(r => r.status === "healthy");
    const affected = regions.filter(r => r.status !== "healthy");
    const globalHealth = regions.length > 0 ? Math.round((healthy.length / regions.length) * 100) : 0;
    return {
      globalHealth, affectedRegions: affected.map(r => r.region),
      summary: affected.length === 0 ? "All regions operating normally" : `${affected.length} region(s) experiencing issues: ${affected.map(r => `${r.region} (${r.status})`).join(", ")}`,
    };
  }, []);

  return { assessGlobal };
}

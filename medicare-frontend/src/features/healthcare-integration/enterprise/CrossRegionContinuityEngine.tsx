/**
 * CrossRegionContinuityEngine — Ensures health data continuity
 * across geographic regions with failover and data sovereignty.
 */
import { useCallback } from "react";

export interface RegionContinuity {
  primaryRegion: string;
  failoverRegion: string;
  replicationStatus: "synced" | "lagging" | "error";
  replicationLagMs: number;
  dataSovereigntyCompliant: boolean;
  lastFailoverTest: number | null;
  failoverReady: boolean;
}

export function useCrossRegionContinuityEngine() {
  const assessContinuity = useCallback((regions: RegionContinuity[]): { ready: boolean; score: number; issues: string[] } => {
    const issues: string[] = [];
    regions.forEach(r => {
      if (!r.dataSovereigntyCompliant) issues.push(`${r.primaryRegion}: data sovereignty non-compliant`);
      if (r.replicationStatus === "error") issues.push(`${r.primaryRegion} → ${r.failoverRegion}: replication error`);
      if (!r.lastFailoverTest || Date.now() - r.lastFailoverTest > 90 * 86400000) issues.push(`${r.primaryRegion}: failover test overdue`);
    });
    const ready = regions.every(r => r.failoverReady && r.dataSovereigntyCompliant);
    return { ready, score: regions.length > 0 ? Math.round(((regions.length - issues.length) / regions.length) * 100) : 0, issues };
  }, []);

  return { assessContinuity };
}

/**
 * HealthInfrastructureMetrics — Tracks health-specific infrastructure metrics
 * including wearable sync health, WebSocket stability, and longitudinal query performance.
 */
import { useCallback, useRef } from "react";

export interface InfraHealthMetrics {
  websocketHealth: { activeConnections: number; reconnectRate: number; messageLatency: number; bufferUtilization: number };
  wearableSyncHealth: { connectedDevices: number; syncSuccessRate: number; avgSyncLatency: number; lastSyncAt: number | null };
  longitudinalQueryHealth: { avgQueryTimeMs: number; cacheHitRate: number; pendingQueries: number; failedQueries: number };
  realtimeMonitoringHealth: { activeStreams: number; dataFreshness: number; renderLatency: number; droppedFrames: number };
  escalationMetrics: { totalEscalations: number; avgResponseTimeMs: number; falsePositiveRate: number };
}

export function useHealthInfrastructureMetrics() {
  const snapshots = useRef<(InfraHealthMetrics & { timestamp: number })[]>([]);

  const recordSnapshot = useCallback((metrics: InfraHealthMetrics): void => {
    snapshots.current = [...snapshots.current.slice(-199), { ...metrics, timestamp: Date.now() }];
  }, []);

  const getLatest = useCallback((): InfraHealthMetrics | null => {
    return snapshots.current.length > 0 ? snapshots.current[snapshots.current.length - 1] : null;
  }, []);

  const computeHealthScore = useCallback((metrics: InfraHealthMetrics): number => {
    const ws = Math.max(0, 100 - metrics.websocketHealth.reconnectRate * 10 - metrics.websocketHealth.bufferUtilization);
    const wear = metrics.wearableSyncHealth.syncSuccessRate * 100;
    const long = Math.max(0, 100 - metrics.longitudinalQueryHealth.avgQueryTimeMs / 50);
    const rt = Math.max(0, 100 - metrics.realtimeMonitoringHealth.droppedFrames * 5);
    return Math.round((ws * 0.3 + wear * 0.2 + long * 0.25 + rt * 0.25));
  }, []);

  const getTrend = useCallback((metric: keyof InfraHealthMetrics, subKey: string): "improving" | "stable" | "declining" => {
    if (snapshots.current.length < 4) return "stable";
    const recent = snapshots.current.slice(-10);
    const values = recent.map(s => {
      const sub = s[metric] as Record<string, number>;
      return sub[subKey] || 0;
    });
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const avgF = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgS = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    if (avgS < avgF * 0.9) return "improving";
    if (avgS > avgF * 1.1) return "declining";
    return "stable";
  }, []);

  return { recordSnapshot, getLatest, computeHealthScore, getTrend };
}

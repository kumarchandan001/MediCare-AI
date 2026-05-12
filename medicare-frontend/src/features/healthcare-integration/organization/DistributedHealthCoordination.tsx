/**
 * DistributedHealthCoordination — Coordinates health intelligence
 * across distributed nodes with consensus and eventual consistency.
 */
import { useCallback } from "react";

export interface DistributedNode {
  id: string;
  region: string;
  role: "primary" | "replica" | "edge" | "analytics";
  status: "online" | "syncing" | "offline" | "degraded";
  lastHeartbeat: number;
  dataVersion: number;
  capabilities: string[];
}

export interface CoordinationStatus {
  nodes: DistributedNode[];
  consensusAchieved: boolean;
  replicationLag: number;
  healthScore: number;
  partitionDetected: boolean;
}

export function useDistributedHealthCoordination() {
  const assessCoordination = useCallback((nodes: DistributedNode[]): CoordinationStatus => {
    const online = nodes.filter(n => n.status === "online" || n.status === "syncing");
    const versions = new Set(online.map(n => n.dataVersion));
    const maxVersion = Math.max(...nodes.map(n => n.dataVersion), 0);
    const lags = online.map(n => maxVersion - n.dataVersion);
    const maxLag = Math.max(...lags, 0);
    const offlineCount = nodes.filter(n => n.status === "offline").length;
    return {
      nodes, consensusAchieved: versions.size <= 1,
      replicationLag: maxLag,
      healthScore: nodes.length > 0 ? Math.round((online.length / nodes.length) * 100) : 0,
      partitionDetected: offlineCount > 0 && online.length > 0 && offlineCount >= nodes.length / 2,
    };
  }, []);

  return { assessCoordination };
}

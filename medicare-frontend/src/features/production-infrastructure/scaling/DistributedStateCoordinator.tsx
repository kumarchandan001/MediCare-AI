/**
 * DistributedStateCoordinator — Coordinates distributed state across
 * multiple clients, tabs, and service workers for consistent health
 * intelligence state management.
 */
import { useCallback, useRef } from "react";

export interface StatePartition {
  id: string;
  domain: string;
  version: number;
  data: Record<string, unknown>;
  lastSynced: number;
  dirty: boolean;
  owner: string;
}

export interface SyncConflict {
  partitionId: string;
  localVersion: number;
  remoteVersion: number;
  resolution: "local_wins" | "remote_wins" | "merge" | "unresolved";
}

export interface StateCoordinationMetrics {
  totalPartitions: number;
  dirtyPartitions: number;
  syncLatency: number;
  conflictCount: number;
  lastFullSync: number;
}

export function useDistributedStateCoordinator() {
  const partitions = useRef<Map<string, StatePartition>>(new Map());
  const conflicts = useRef<SyncConflict[]>([]);

  const registerPartition = useCallback((domain: string, initialData: Record<string, unknown> = {}): StatePartition => {
    const partition: StatePartition = {
      id: `part-${domain}-${Date.now()}`, domain, version: 1,
      data: initialData, lastSynced: Date.now(), dirty: false, owner: "local",
    };
    partitions.current.set(partition.id, partition);
    return partition;
  }, []);

  const updatePartition = useCallback((id: string, data: Record<string, unknown>): StatePartition | null => {
    const p = partitions.current.get(id);
    if (!p) return null;
    const updated = { ...p, data: { ...p.data, ...data }, version: p.version + 1, dirty: true };
    partitions.current.set(id, updated);
    return updated;
  }, []);

  const resolveConflict = useCallback((conflict: SyncConflict, local: StatePartition, remote: StatePartition): StatePartition => {
    if (conflict.resolution === "remote_wins") return { ...remote, dirty: false, lastSynced: Date.now() };
    if (conflict.resolution === "local_wins") return { ...local, dirty: true };
    // Merge: take remote base, overlay local changes
    return { ...remote, data: { ...remote.data, ...local.data }, version: Math.max(local.version, remote.version) + 1, dirty: true, lastSynced: Date.now() };
  }, []);

  const getMetrics = useCallback((): StateCoordinationMetrics => {
    const all = Array.from(partitions.current.values());
    return {
      totalPartitions: all.length,
      dirtyPartitions: all.filter(p => p.dirty).length,
      syncLatency: all.length > 0 ? Date.now() - Math.min(...all.map(p => p.lastSynced)) : 0,
      conflictCount: conflicts.current.length,
      lastFullSync: all.length > 0 ? Math.max(...all.map(p => p.lastSynced)) : 0,
    };
  }, []);

  return { registerPartition, updatePartition, resolveConflict, getMetrics };
}

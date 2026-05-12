/**
 * CrossPlatformHealthSync — Manages health data synchronization across
 * platforms with conflict resolution and versioning.
 */
import { useCallback, useRef } from "react";

export interface SyncRecord {
  id: string;
  platform: string;
  dataType: string;
  direction: "push" | "pull" | "bidirectional";
  status: "synced" | "pending" | "conflict" | "error";
  localVersion: number;
  remoteVersion: number;
  lastSynced: number | null;
  conflictResolution: "local_wins" | "remote_wins" | "manual" | "merge";
}

export function useCrossPlatformHealthSync() {
  const records = useRef<Map<string, SyncRecord>>(new Map());

  const registerSync = useCallback((record: SyncRecord): void => {
    records.current.set(record.id, record);
  }, []);

  const detectConflicts = useCallback((): SyncRecord[] => {
    return Array.from(records.current.values()).filter(r => r.localVersion !== r.remoteVersion && r.status !== "synced");
  }, []);

  const resolveConflict = useCallback((id: string, strategy: SyncRecord["conflictResolution"]): SyncRecord | null => {
    const record = records.current.get(id);
    if (!record) return null;
    const resolved: SyncRecord = {
      ...record, status: "synced", conflictResolution: strategy, lastSynced: Date.now(),
      localVersion: strategy === "remote_wins" ? record.remoteVersion : record.localVersion,
      remoteVersion: strategy === "local_wins" ? record.localVersion : record.remoteVersion,
    };
    records.current.set(id, resolved);
    return resolved;
  }, []);

  const getSyncHealth = useCallback((): { total: number; synced: number; conflicts: number; errors: number } => {
    const all = Array.from(records.current.values());
    return { total: all.length, synced: all.filter(r => r.status === "synced").length, conflicts: all.filter(r => r.status === "conflict").length, errors: all.filter(r => r.status === "error").length };
  }, []);

  return { registerSync, detectConflicts, resolveConflict, getSyncHealth };
}

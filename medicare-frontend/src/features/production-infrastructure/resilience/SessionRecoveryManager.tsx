/**
 * SessionRecoveryManager — Recovers user sessions after disconnects,
 * crashes, or tab closures while preserving investigation state,
 * conversation context, and health monitoring continuity.
 */
import { useCallback } from "react";

export interface SessionSnapshot {
  sessionId: string;
  userId: string;
  capturedAt: number;
  state: Record<string, unknown>;
  activeFeatures: string[];
  conversationContext: { lastMessages: string[]; investigationId: string | null };
  wearableState: { connectedDevices: string[]; lastSync: number | null };
  navigationPath: string;
  formData: Record<string, unknown>;
}

export interface RecoveryResult {
  recovered: boolean;
  snapshot: SessionSnapshot | null;
  staleDataWarnings: string[];
  restoredFeatures: string[];
  failedFeatures: string[];
  recoveryDurationMs: number;
}

const SNAPSHOT_KEY = "medicare_session_snapshot";
const MAX_STALENESS_MS = 30 * 60 * 1000; // 30 minutes

export function useSessionRecoveryManager() {
  const captureSnapshot = useCallback((snapshot: SessionSnapshot): boolean => {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      return true;
    } catch { return false; }
  }, []);

  const attemptRecovery = useCallback((): RecoveryResult => {
    const start = Date.now();
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return { recovered: false, snapshot: null, staleDataWarnings: [], restoredFeatures: [], failedFeatures: [], recoveryDurationMs: Date.now() - start };

      const snapshot: SessionSnapshot = JSON.parse(raw);
      const age = Date.now() - snapshot.capturedAt;
      const staleDataWarnings: string[] = [];

      if (age > MAX_STALENESS_MS) {
        staleDataWarnings.push(`Session snapshot is ${Math.round(age / 60000)} minutes old — some data may be outdated`);
      }
      if (snapshot.wearableState.lastSync && Date.now() - snapshot.wearableState.lastSync > 600000) {
        staleDataWarnings.push("Wearable data is stale — will re-sync on reconnection");
      }

      return {
        recovered: true, snapshot, staleDataWarnings,
        restoredFeatures: snapshot.activeFeatures,
        failedFeatures: [],
        recoveryDurationMs: Date.now() - start,
      };
    } catch {
      return { recovered: false, snapshot: null, staleDataWarnings: ["Recovery failed — starting fresh session"], restoredFeatures: [], failedFeatures: [], recoveryDurationMs: Date.now() - start };
    }
  }, []);

  const clearSnapshot = useCallback((): void => {
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch { /* ignore */ }
  }, []);

  const hasRecoverableSession = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      return Date.now() - snapshot.capturedAt < MAX_STALENESS_MS;
    } catch { return false; }
  }, []);

  return { captureSnapshot, attemptRecovery, clearSnapshot, hasRecoverableSession };
}

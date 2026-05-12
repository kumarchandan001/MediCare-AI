/**
 * RealtimeReconnectCoordinator — Manages WebSocket and realtime stream
 * reconnection with exponential backoff, jitter, and state reconciliation.
 */
import { useCallback, useRef } from "react";

export interface ReconnectState {
  connectionId: string;
  channel: string;
  status: "connected" | "disconnected" | "reconnecting" | "backoff" | "failed";
  attempt: number;
  maxAttempts: number;
  nextRetryAt: number | null;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  missedMessages: number;
}

export interface ReconnectPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  backoffMultiplier: number;
}

const DEFAULT_POLICY: ReconnectPolicy = {
  maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 30000,
  jitterFactor: 0.3, backoffMultiplier: 2,
};

export function useRealtimeReconnectCoordinator(policyOverrides?: Partial<ReconnectPolicy>) {
  const policy = useRef<ReconnectPolicy>({ ...DEFAULT_POLICY, ...policyOverrides });
  const connections = useRef<Map<string, ReconnectState>>(new Map());

  const computeBackoff = useCallback((attempt: number): number => {
    const p = policy.current;
    const delay = Math.min(p.maxDelayMs, p.baseDelayMs * Math.pow(p.backoffMultiplier, attempt));
    const jitter = delay * p.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(p.baseDelayMs, delay + jitter);
  }, []);

  const onDisconnect = useCallback((connectionId: string, channel: string): ReconnectState => {
    const existing = connections.current.get(connectionId);
    const state: ReconnectState = {
      connectionId, channel, status: "reconnecting",
      attempt: (existing?.attempt || 0) + 1,
      maxAttempts: policy.current.maxAttempts,
      nextRetryAt: Date.now() + computeBackoff((existing?.attempt || 0) + 1),
      lastConnectedAt: existing?.lastConnectedAt || null,
      lastDisconnectedAt: Date.now(),
      missedMessages: 0,
    };
    if (state.attempt > policy.current.maxAttempts) state.status = "failed";
    connections.current.set(connectionId, state);
    return state;
  }, [computeBackoff]);

  const onReconnected = useCallback((connectionId: string): ReconnectState | null => {
    const state = connections.current.get(connectionId);
    if (!state) return null;
    const updated: ReconnectState = { ...state, status: "connected", attempt: 0, nextRetryAt: null, lastConnectedAt: Date.now() };
    connections.current.set(connectionId, updated);
    return updated;
  }, []);

  const shouldRetry = useCallback((connectionId: string): { retry: boolean; waitMs: number } => {
    const state = connections.current.get(connectionId);
    if (!state || state.status === "failed" || state.status === "connected") return { retry: false, waitMs: 0 };
    const waitMs = state.nextRetryAt ? Math.max(0, state.nextRetryAt - Date.now()) : 0;
    return { retry: true, waitMs };
  }, []);

  const getAll = useCallback((): ReconnectState[] => Array.from(connections.current.values()), []);

  return { onDisconnect, onReconnected, shouldRetry, getAll, computeBackoff };
}

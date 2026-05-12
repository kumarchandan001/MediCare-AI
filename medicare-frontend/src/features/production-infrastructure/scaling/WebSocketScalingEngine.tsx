/**
 * WebSocketScalingEngine — Manages WebSocket connection pooling,
 * load balancing, backpressure control, and connection lifecycle
 * to prevent bottlenecks in high-frequency health data streams.
 */
import { useCallback, useRef } from "react";

export interface WSConnectionPool {
  id: string;
  connections: WSConnection[];
  maxConnections: number;
  activeCount: number;
  backpressureLevel: "none" | "low" | "medium" | "high" | "critical";
  messageRate: number;
  bufferUsage: number;
}

export interface WSConnection {
  id: string;
  channel: string;
  status: "connecting" | "open" | "throttled" | "closing" | "closed";
  messagesPerSecond: number;
  bufferSize: number;
  lastActivity: number;
  reconnectAttempts: number;
}

export interface WSScalingPolicy {
  maxConnectionsPerPool: number;
  throttleThresholdMsgPerSec: number;
  backpressureBufferLimit: number;
  idleTimeoutMs: number;
  maxReconnectAttempts: number;
  reconnectBackoffMs: number;
}

const DEFAULT_POLICY: WSScalingPolicy = {
  maxConnectionsPerPool: 50, throttleThresholdMsgPerSec: 100,
  backpressureBufferLimit: 5000, idleTimeoutMs: 300000,
  maxReconnectAttempts: 5, reconnectBackoffMs: 1000,
};

export function useWebSocketScalingEngine(policyOverrides?: Partial<WSScalingPolicy>) {
  const policy = useRef<WSScalingPolicy>({ ...DEFAULT_POLICY, ...policyOverrides });

  const evaluatePool = useCallback((pool: WSConnectionPool): { action: "none" | "throttle" | "shed" | "scale"; detail: string } => {
    const totalMsgRate = pool.connections.reduce((s, c) => s + c.messagesPerSecond, 0);
    if (totalMsgRate > policy.current.throttleThresholdMsgPerSec * 2) return { action: "shed", detail: `Message rate ${totalMsgRate}/s exceeds 2x threshold — shedding low-priority connections` };
    if (totalMsgRate > policy.current.throttleThresholdMsgPerSec) return { action: "throttle", detail: `Message rate ${totalMsgRate}/s exceeds threshold — applying throttle` };
    if (pool.activeCount > pool.maxConnections * 0.9) return { action: "scale", detail: `Connection pool at ${Math.round((pool.activeCount / pool.maxConnections) * 100)}% capacity` };
    return { action: "none", detail: "Pool operating within normal parameters" };
  }, []);

  const computeBackpressure = useCallback((connections: WSConnection[]): WSConnectionPool["backpressureLevel"] => {
    const totalBuffer = connections.reduce((s, c) => s + c.bufferSize, 0);
    const ratio = totalBuffer / policy.current.backpressureBufferLimit;
    if (ratio > 0.9) return "critical";
    if (ratio > 0.7) return "high";
    if (ratio > 0.4) return "medium";
    if (ratio > 0.1) return "low";
    return "none";
  }, []);

  const identifyIdleConnections = useCallback((connections: WSConnection[]): WSConnection[] => {
    const now = Date.now();
    return connections.filter(c => c.status === "open" && now - c.lastActivity > policy.current.idleTimeoutMs);
  }, []);

  const shouldReconnect = useCallback((conn: WSConnection): boolean => {
    return conn.status === "closed" && conn.reconnectAttempts < policy.current.maxReconnectAttempts;
  }, []);

  return { evaluatePool, computeBackpressure, identifyIdleConnections, shouldReconnect, getPolicy: () => policy.current };
}

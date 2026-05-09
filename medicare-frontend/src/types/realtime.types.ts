/**
 * Realtime Types — WebSocket and streaming data models
 */
import type { WSConnectionStatus } from "./api.types";

// ── Realtime State ───────────────────────
export interface RealtimeState {
  connectionStatus: WSConnectionStatus;
  lastHeartbeat: string | null;
  reconnectAttempts: number;
  channels: Map<string, ChannelSubscription>;
  liveMetrics: LiveMetrics | null;
  streamingAlerts: StreamingAlert[];
}

export interface ChannelSubscription {
  channel: string;
  subscribed: boolean;
  lastMessage: string | null;
}

// ── Live Metrics (streamed via WS) ───────
export interface LiveMetrics {
  heart_rate: number;
  stress_level: number;
  activity_state: "resting" | "active" | "exercising" | "sleeping";
  recovery_trend: "improving" | "declining" | "stable";
  timestamp: string;
}

// ── Streaming Alert ──────────────────────
export interface StreamingAlert {
  id: string;
  type: "physiological" | "behavioral" | "environmental" | "system";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: string;
  auto_dismiss: boolean;
  dismiss_after_ms?: number;
}

// ── WS Event Types ───────────────────────
export type WSEventType =
  | "health.vitals.update"
  | "health.alert.new"
  | "health.insight.new"
  | "orchestration.cycle.complete"
  | "twin.state.update"
  | "wearable.sync.update"
  | "agent.proposal.new"
  | "governance.alert"
  | "system.heartbeat";

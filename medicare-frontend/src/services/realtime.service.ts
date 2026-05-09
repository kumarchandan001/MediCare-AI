/**
 * Realtime Service — WebSocket connection lifecycle management
 */
import { wsManager } from "@/websocket/websocket.manager";
import { useRealtimeStore } from "@/store/realtimeStore";
import type { LiveMetrics, StreamingAlert } from "@/types/realtime.types";

export const realtimeService = {
  /** Initialize WebSocket with auth token and bind store updates */
  init(token?: string): void {
    // Bind connection status → store
    wsManager.onStatusChange((status) => {
      useRealtimeStore.getState().setConnectionStatus(status);
    });

    // Bind live metric updates
    wsManager.on("health.vitals.update", (payload) => {
      useRealtimeStore.getState().updateLiveMetrics(payload as LiveMetrics);
    });

    // Bind streaming alerts
    wsManager.on("health.alert.new", (payload) => {
      useRealtimeStore.getState().addStreamingAlert(payload as StreamingAlert);
    });

    // Bind heartbeat
    wsManager.on("system.heartbeat", () => {
      useRealtimeStore.getState().setLastHeartbeat(new Date().toISOString());
    });

    // Connect
    wsManager.connect(token);
  },

  /** Gracefully disconnect */
  disconnect(): void {
    wsManager.disconnect();
  },

  /** Send a message through the WebSocket */
  send(type: string, payload: unknown): boolean {
    return wsManager.send(type, payload);
  },

  /** Subscribe to a specific event type */
  on(eventType: string, handler: (payload: unknown) => void): () => void {
    return wsManager.on(eventType as any, handler);
  },
};

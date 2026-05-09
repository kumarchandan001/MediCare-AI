/**
 * Realtime Store — Zustand store for live WebSocket data
 */
import { create } from "zustand";
import type { WSConnectionStatus } from "@/types/api.types";
import type { LiveMetrics, StreamingAlert } from "@/types/realtime.types";

interface RealtimeState {
  // Connection
  connectionStatus: WSConnectionStatus;
  lastHeartbeat: string | null;
  reconnectAttempts: number;

  // Live data
  liveMetrics: LiveMetrics | null;
  streamingAlerts: StreamingAlert[];

  // Notifications
  unreadNotifications: number;

  // Actions
  setConnectionStatus: (status: WSConnectionStatus) => void;
  setLastHeartbeat: (ts: string) => void;
  setReconnectAttempts: (n: number) => void;
  updateLiveMetrics: (metrics: LiveMetrics) => void;
  addStreamingAlert: (alert: StreamingAlert) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  connectionStatus: "disconnected",
  lastHeartbeat: null,
  reconnectAttempts: 0,
  liveMetrics: null,
  streamingAlerts: [],
  unreadNotifications: 0,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastHeartbeat: (ts) => set({ lastHeartbeat: ts }),
  setReconnectAttempts: (n) => set({ reconnectAttempts: n }),

  updateLiveMetrics: (metrics) => set({ liveMetrics: metrics }),

  addStreamingAlert: (alert) =>
    set((s) => ({
      streamingAlerts: [alert, ...s.streamingAlerts].slice(0, 50),
      unreadNotifications: s.unreadNotifications + 1,
    })),

  dismissAlert: (id) =>
    set((s) => ({
      streamingAlerts: s.streamingAlerts.filter((a) => a.id !== id),
    })),

  clearAlerts: () => set({ streamingAlerts: [] }),
  incrementNotifications: () => set((s) => ({ unreadNotifications: s.unreadNotifications + 1 })),
  clearNotifications: () => set({ unreadNotifications: 0 }),
}));

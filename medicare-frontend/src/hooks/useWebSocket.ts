/**
 * useWebSocket — Hook for consuming realtime WebSocket data
 */
import { useEffect, useRef } from "react";
import { useRealtimeStore } from "@/store/realtimeStore";
import { realtimeService } from "@/services/realtime.service";
import type { WSEventType } from "@/types/realtime.types";

/** Initialize WebSocket connection (call once at app root) */
export function useWebSocketInit(token?: string) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    realtimeService.init(token);

    return () => {
      realtimeService.disconnect();
      initialized.current = false;
    };
  }, [token]);
}

/** Subscribe to a specific WebSocket event */
export function useWebSocketEvent(
  eventType: WSEventType,
  handler: (payload: unknown) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = realtimeService.on(eventType, (payload) => {
      handlerRef.current(payload);
    });
    return unsub;
  }, [eventType]);
}

/** Get current connection status */
export function useConnectionStatus() {
  return useRealtimeStore((s) => s.connectionStatus);
}

/** Get live metrics */
export function useLiveMetrics() {
  return useRealtimeStore((s) => s.liveMetrics);
}

/** Get streaming alerts */
export function useStreamingAlerts() {
  const alerts = useRealtimeStore((s) => s.streamingAlerts);
  const dismiss = useRealtimeStore((s) => s.dismissAlert);
  const clear = useRealtimeStore((s) => s.clearAlerts);
  return { alerts, dismiss, clear };
}

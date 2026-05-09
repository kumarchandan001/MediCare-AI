/**
 * WebSocket Manager — Production-Grade Realtime Infrastructure
 * ─────────────────────────────────────────────────────────────
 * Handles connection lifecycle, reconnection with exponential backoff,
 * mobile network resilience, offline message queueing, and event dispatching.
 */
import type { WSConnectionStatus, WSMessage } from "@/types/api.types";
import type { WSEventType } from "@/types/realtime.types";
import { crashReporter } from "@/lib/crashReporting";

type EventHandler = (payload: unknown) => void;

interface WSManagerConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
  /** Max queued messages while disconnected */
  maxQueueSize?: number;
}

const DEFAULT_CONFIG: Partial<WSManagerConfig> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 15,
  heartbeatInterval: 30000,
  debug: false,
  maxQueueSize: 100,
};

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WSManagerConfig;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private statusListeners: Set<(status: WSConnectionStatus) => void> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private _status: WSConnectionStatus = "disconnected";
  private intentionalClose = false;

  // ── Production Hardening State ─────────────────
  private messageQueue: { type: string; payload: unknown }[] = [];
  private lastPongTime = 0;
  private networkOnline = navigator.onLine;
  private savedToken?: string;

  constructor(config: WSManagerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupNetworkListeners();
  }

  // ── Network Awareness (Mobile Resilience) ─────
  private setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.networkOnline = true;
      if (this.config.debug) console.log("[WS] Network online — reconnecting...");
      // Adaptive delay: wait briefly for network stabilization
      setTimeout(() => {
        if (this._status !== "connected" && !this.intentionalClose) {
          this.reconnectAttempts = 0; // reset on network recovery
          this.connect(this.savedToken);
        }
      }, 1500);
    });

    window.addEventListener("offline", () => {
      this.networkOnline = false;
      if (this.config.debug) console.log("[WS] Network offline");
      this.setStatus("reconnecting");
    });
  }

  // ── Connection Status ──────────────────────────
  get status(): WSConnectionStatus {
    return this._status;
  }

  get isOnline(): boolean {
    return this.networkOnline;
  }

  get queuedMessageCount(): number {
    return this.messageQueue.length;
  }

  private setStatus(status: WSConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  // ── Connect ────────────────────────────────────
  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (!this.networkOnline) {
      this.setStatus("reconnecting");
      return;
    }

    this.savedToken = token;
    this.intentionalClose = false;
    this.setStatus("connecting");

    try {
      const url = token ? `${this.config.url}?token=${token}` : this.config.url;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.lastPongTime = Date.now();
        this.startHeartbeat();
        this.flushQueue();
        if (this.config.debug) console.log("[WS] Connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Handle system pings from backend
          if (message.type === "system.ping") {
            this.send("system.pong", { timestamp: Date.now() });
            return;
          }

          // Track pong for heartbeat health
          if (message.type === "system.pong" || message.type === "system.heartbeat_ack") {
            this.lastPongTime = Date.now();
            return;
          }

          this.dispatch(message.type, message.payload);
          this.dispatch("*", message); // wildcard listeners
        } catch (err) {
          if (this.config.debug) console.warn("[WS] Parse error:", err);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (!this.intentionalClose) {
          this.setStatus("reconnecting");
          this.scheduleReconnect(token);
          if (this.config.debug) console.log("[WS] Closed, reconnecting...", event.code);
        } else {
          this.setStatus("disconnected");
        }
      };

      this.ws.onerror = () => {
        this.setStatus("error");
        crashReporter.reportWebSocketFailure(
          `WebSocket error — attempt ${this.reconnectAttempts}`
        );
        if (this.config.debug) console.error("[WS] Connection error");
      };
    } catch {
      this.setStatus("error");
      this.scheduleReconnect(token);
    }
  }

  // ── Disconnect ─────────────────────────────────
  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.clearReconnect();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  // ── Send Message (with offline queueing) ──────
  send(type: string, payload: unknown): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      // Queue message for later delivery
      const maxQ = this.config.maxQueueSize ?? 100;
      if (this.messageQueue.length < maxQ) {
        this.messageQueue.push({ type, payload });
      }
      return false;
    }
    const message: WSMessage = {
      type,
      channel: "client",
      payload,
      timestamp: new Date().toISOString(),
    };
    this.ws.send(JSON.stringify(message));
    return true;
  }

  // ── Flush Queued Messages ─────────────────────
  private flushQueue(): void {
    if (this.messageQueue.length === 0) return;
    if (this.config.debug) {
      console.log(`[WS] Flushing ${this.messageQueue.length} queued messages`);
    }
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    for (const msg of queue) {
      this.send(msg.type, msg.payload);
    }
  }

  // ── Subscribe to Events ────────────────────────
  on(eventType: WSEventType | "*", handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  // ── Subscribe to Status Changes ────────────────
  onStatusChange(handler: (status: WSConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  // ── Private: Dispatch Event ────────────────────
  private dispatch(eventType: string, payload: unknown): void {
    this.listeners.get(eventType)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[WS] Handler error for ${eventType}:`, err);
      }
    });
  }

  // ── Private: Reconnect Logic (Exponential Backoff) ──
  private scheduleReconnect(token?: string): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 15)) {
      this.setStatus("error");
      crashReporter.reportWebSocketFailure("Max reconnect attempts reached");
      if (this.config.debug) console.error("[WS] Max reconnect attempts reached");
      return;
    }

    // Don't reconnect if offline — wait for online event
    if (!this.networkOnline) {
      if (this.config.debug) console.log("[WS] Offline — waiting for network...");
      return;
    }

    this.clearReconnect();

    // Exponential backoff with jitter for mobile stability
    const baseDelay = this.config.reconnectInterval ?? 3000;
    const delay = Math.min(
      baseDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.config.debug) console.log(`[WS] Reconnect attempt ${this.reconnectAttempts} (delay: ${Math.round(delay)}ms)`);
      this.connect(token);
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Private: Heartbeat with Stale Detection ───
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      // Stale connection detection
      const sinceLastPong = Date.now() - this.lastPongTime;
      if (sinceLastPong > (this.config.heartbeatInterval ?? 30000) * 2) {
        if (this.config.debug) console.warn("[WS] Stale connection detected — reconnecting");
        this.ws?.close(4000, "Stale heartbeat");
        return;
      }
      this.send("system.heartbeat", { timestamp: Date.now() });
    }, this.config.heartbeatInterval ?? 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ── Diagnostics ────────────────────────────────
  getDiagnostics(): Record<string, unknown> {
    return {
      status: this._status,
      networkOnline: this.networkOnline,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastPongAge: this.lastPongTime ? Date.now() - this.lastPongTime : null,
      listenerCount: Array.from(this.listeners.values()).reduce((s, set) => s + set.size, 0),
    };
  }
}

// ── Singleton Instance ───────────────────────────
export const wsManager = new WebSocketManager({
  url: `${(import.meta.env.VITE_WS_URL || "ws://localhost:8000")}/ws/health`,
  debug: import.meta.env.DEV,
});

export default WebSocketManager;

/**
 * useStreamSafety — Frontend streaming safety controls
 * 
 * Prevents unstable realtime behavior during long sessions:
 * - Maximum frequency limits
 * - Stale-data detection & warnings
 * - Memory-safe buffer caps
 * - Adaptive reconnect delays
 * - Performance monitoring
 */
import { useState, useEffect, useRef, useCallback } from "react";

// ── Stale Data Detection ──────────────────────
interface StaleDataOptions {
  /** Max age in ms before data is considered stale (default: 30s) */
  maxAge?: number;
  /** Check interval (default: 5s) */
  checkInterval?: number;
}

export type DataFreshness = "live" | "recent" | "stale" | "expired";

export function useDataFreshness(
  lastUpdated: string | number | null,
  options: StaleDataOptions = {}
): { freshness: DataFreshness; ageMs: number; ageLabel: string } {
  const { maxAge = 30_000, checkInterval = 5_000 } = options;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), checkInterval);
    return () => clearInterval(id);
  }, [checkInterval]);

  if (!lastUpdated) {
    return { freshness: "expired", ageMs: Infinity, ageLabel: "No data" };
  }

  const ts = typeof lastUpdated === "string" ? new Date(lastUpdated).getTime() : lastUpdated;
  const ageMs = now - ts;

  let freshness: DataFreshness;
  if (ageMs < maxAge * 0.5) freshness = "live";
  else if (ageMs < maxAge) freshness = "recent";
  else if (ageMs < maxAge * 3) freshness = "stale";
  else freshness = "expired";

  let ageLabel: string;
  if (ageMs < 5_000) ageLabel = "Just now";
  else if (ageMs < 60_000) ageLabel = `${Math.floor(ageMs / 1000)}s ago`;
  else if (ageMs < 3_600_000) ageLabel = `${Math.floor(ageMs / 60_000)}m ago`;
  else ageLabel = `${Math.floor(ageMs / 3_600_000)}h ago`;

  return { freshness, ageMs, ageLabel };
}

// ── Frequency Limiter ─────────────────────────
interface FrequencyLimiterResult {
  /** Whether the current event should be processed */
  shouldProcess: boolean;
  /** Call this when an event arrives */
  recordEvent: () => boolean;
  /** Events processed in current window */
  eventCount: number;
  /** Events dropped in current window */
  droppedCount: number;
  /** Reset the limiter */
  reset: () => void;
}

export function useFrequencyLimiter(
  maxPerSecond: number = 10
): FrequencyLimiterResult {
  const eventsRef = useRef<number[]>([]);
  const droppedRef = useRef(0);
  const [, forceRender] = useState(0);

  const recordEvent = useCallback((): boolean => {
    const now = Date.now();
    // Remove events older than 1 second
    eventsRef.current = eventsRef.current.filter((t) => now - t < 1000);

    if (eventsRef.current.length >= maxPerSecond) {
      droppedRef.current++;
      return false;
    }

    eventsRef.current.push(now);
    return true;
  }, [maxPerSecond]);

  const reset = useCallback(() => {
    eventsRef.current = [];
    droppedRef.current = 0;
    forceRender((n) => n + 1);
  }, []);

  return {
    shouldProcess: eventsRef.current.length < maxPerSecond,
    recordEvent,
    eventCount: eventsRef.current.length,
    droppedCount: droppedRef.current,
    reset,
  };
}

// ── Stream Performance Monitor ────────────────
export interface StreamPerformance {
  /** Messages received per second */
  messagesPerSec: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** Render cycles per second */
  rendersPerSec: number;
  /** Total dropped frames/messages */
  droppedTotal: number;
  /** Session uptime in seconds */
  uptimeSec: number;
  /** Memory pressure estimate */
  memoryPressure: "low" | "moderate" | "high";
}

export function useStreamPerformance(): {
  perf: StreamPerformance;
  recordMessage: (latencyMs?: number) => void;
  recordRender: () => void;
  recordDrop: () => void;
} {
  const startTime = useRef(Date.now());
  const messages = useRef<number[]>([]);
  const latencies = useRef<number[]>([]);
  const renders = useRef<number[]>([]);
  const dropped = useRef(0);
  const [perf, setPerf] = useState<StreamPerformance>({
    messagesPerSec: 0,
    avgLatencyMs: 0,
    rendersPerSec: 0,
    droppedTotal: 0,
    uptimeSec: 0,
    memoryPressure: "low",
  });

  // Update perf metrics every 2s
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const oneSecAgo = now - 1000;

      messages.current = messages.current.filter((t) => t > oneSecAgo);
      renders.current = renders.current.filter((t) => t > oneSecAgo);

      // Keep only recent latencies
      const recentLatencies = latencies.current.slice(-50);
      const avgLat = recentLatencies.length > 0
        ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length
        : 0;

      // Estimate memory pressure from buffer sizes
      const totalBuffered = messages.current.length + renders.current.length;
      const pressure: "low" | "moderate" | "high" =
        totalBuffered > 100 ? "high" : totalBuffered > 50 ? "moderate" : "low";

      setPerf({
        messagesPerSec: messages.current.length,
        avgLatencyMs: Math.round(avgLat),
        rendersPerSec: renders.current.length,
        droppedTotal: dropped.current,
        uptimeSec: Math.floor((now - startTime.current) / 1000),
        memoryPressure: pressure,
      });
    }, 2000);

    return () => clearInterval(id);
  }, []);

  const recordMessage = useCallback((latencyMs?: number) => {
    messages.current.push(Date.now());
    if (latencyMs !== undefined) {
      latencies.current.push(latencyMs);
      if (latencies.current.length > 200) latencies.current = latencies.current.slice(-100);
    }
  }, []);

  const recordRender = useCallback(() => {
    renders.current.push(Date.now());
  }, []);

  const recordDrop = useCallback(() => {
    dropped.current++;
  }, []);

  return { perf, recordMessage, recordRender, recordDrop };
}

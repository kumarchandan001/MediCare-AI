/**
 * useThrottledStream — Batches high-frequency WebSocket updates
 * 
 * Prevents React render storms by accumulating incoming data points
 * and flushing at a controlled interval. Ensures smooth, stable UX
 * even under 10+ updates/second from the backend.
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface ThrottleOptions {
  /** Flush interval in ms (default: 250ms = 4 updates/sec) */
  interval?: number;
  /** Maximum buffer size before force-flush (default: 20) */
  maxBuffer?: number;
  /** Merge strategy for incoming items */
  strategy?: "latest" | "accumulate";
}

/**
 * Throttled single-value stream — always takes the latest value
 */
export function useThrottledValue<T>(
  rawValue: T | null,
  interval = 250
): T | null {
  const [throttled, setThrottled] = useState<T | null>(rawValue);
  const latestRef = useRef<T | null>(rawValue);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    latestRef.current = rawValue;
  }, [rawValue]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setThrottled((prev) => {
        if (prev === latestRef.current) return prev; // No change, skip render
        return latestRef.current;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval]);

  return throttled;
}

/**
 * Throttled stream accumulator — buffers items and flushes in batches
 */
export function useThrottledStream<T>(
  options: ThrottleOptions = {}
): {
  items: T[];
  push: (item: T) => void;
  latest: T | null;
  clear: () => void;
  bufferSize: number;
} {
  const { interval = 250, maxBuffer = 20, strategy = "accumulate" } = options;

  const [items, setItems] = useState<T[]>([]);
  const bufferRef = useRef<T[]>([]);
  const latestRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = useCallback(
    (item: T) => {
      latestRef.current = item;

      if (strategy === "latest") {
        bufferRef.current = [item];
      } else {
        bufferRef.current.push(item);

        // Force flush if buffer is full
        if (bufferRef.current.length >= maxBuffer) {
          const batch = bufferRef.current.slice();
          bufferRef.current = [];
          setItems((prev) => [...prev, ...batch].slice(-100)); // Cap at 100 items
        }
      }
    },
    [strategy, maxBuffer]
  );

  // Interval-based flush
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (bufferRef.current.length === 0) return;
      const batch = bufferRef.current.slice();
      bufferRef.current = [];
      setItems((prev) => [...prev, ...batch].slice(-100));
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval]);

  const clear = useCallback(() => {
    setItems([]);
    bufferRef.current = [];
    latestRef.current = null;
  }, []);

  return {
    items,
    push,
    latest: latestRef.current,
    clear,
    bufferSize: bufferRef.current.length,
  };
}

/**
 * useAdaptiveRefreshRate — Adapts the refresh interval based on device capability
 * Mobile → slower refresh, Desktop → faster
 */
export function useAdaptiveRefreshRate(
  base: number = 250,
  options?: { isMobile?: boolean; isLowPower?: boolean }
): number {
  const { isMobile = false, isLowPower = false } = options ?? {};

  if (isLowPower) return base * 4;   // 1s on low-power
  if (isMobile) return base * 2;     // 500ms on mobile
  return base;                        // 250ms on desktop
}

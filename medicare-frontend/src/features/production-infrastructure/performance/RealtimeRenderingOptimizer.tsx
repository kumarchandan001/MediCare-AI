/**
 * RealtimeRenderingOptimizer — Prevents render storms, optimizes
 * frame budgets, and manages rendering priority for realtime
 * health monitoring dashboards.
 */
import { useCallback, useRef } from "react";

export interface RenderMetrics {
  componentName: string;
  renderCount: number;
  avgRenderTimeMs: number;
  lastRenderTimeMs: number;
  unnecessaryRenders: number;
  frameBudgetExceeded: number;
}

export interface RenderOptimizationResult {
  shouldThrottle: boolean;
  recommendedIntervalMs: number;
  skipReason: string | null;
  priority: "high" | "normal" | "low" | "deferred";
}

export function useRealtimeRenderingOptimizer(frameBudgetMs = 16) {
  const metrics = useRef<Map<string, RenderMetrics>>(new Map());
  const lastRenderTimes = useRef<Map<string, number>>(new Map());

  const recordRender = useCallback((component: string, durationMs: number) => {
    const existing = metrics.current.get(component) || {
      componentName: component, renderCount: 0, avgRenderTimeMs: 0,
      lastRenderTimeMs: 0, unnecessaryRenders: 0, frameBudgetExceeded: 0,
    };
    const newCount = existing.renderCount + 1;
    const newAvg = (existing.avgRenderTimeMs * existing.renderCount + durationMs) / newCount;
    metrics.current.set(component, {
      ...existing, renderCount: newCount, avgRenderTimeMs: newAvg,
      lastRenderTimeMs: durationMs,
      frameBudgetExceeded: existing.frameBudgetExceeded + (durationMs > frameBudgetMs ? 1 : 0),
    });
    lastRenderTimes.current.set(component, Date.now());
  }, [frameBudgetMs]);

  const shouldRender = useCallback((component: string, dataAge: number, priority: "high" | "normal" | "low" = "normal"): RenderOptimizationResult => {
    const lastRender = lastRenderTimes.current.get(component) || 0;
    const elapsed = Date.now() - lastRender;
    const minIntervals = { high: 100, normal: 250, low: 1000 };
    const minInterval = minIntervals[priority];

    if (elapsed < minInterval) {
      return { shouldThrottle: true, recommendedIntervalMs: minInterval - elapsed, skipReason: `Throttled — ${minInterval - elapsed}ms remaining`, priority };
    }
    if (dataAge < 50 && priority !== "high") {
      return { shouldThrottle: true, recommendedIntervalMs: 200, skipReason: "Data too fresh — batching updates", priority: "deferred" };
    }
    return { shouldThrottle: false, recommendedIntervalMs: 0, skipReason: null, priority };
  }, []);

  const getHotComponents = useCallback((threshold = 10): RenderMetrics[] => {
    return Array.from(metrics.current.values())
      .filter(m => m.frameBudgetExceeded > threshold)
      .sort((a, b) => b.frameBudgetExceeded - a.frameBudgetExceeded);
  }, []);

  return { recordRender, shouldRender, getHotComponents, getAllMetrics: () => Array.from(metrics.current.values()) };
}

/**
 * ResourceEfficientRealtimeUX — Delivers smooth realtime health UX on
 * resource-constrained devices through intelligent rendering strategies.
 */
import { useCallback } from "react";

export interface RealtimeUXConfig {
  virtualizedLists: boolean;
  lazyLoadCharts: boolean;
  deferredUpdates: boolean;
  skeletonLoading: boolean;
  progressiveImageLoading: boolean;
  maxVisibleCards: number;
  chartResolution: "full" | "sampled" | "simplified";
  updateBatching: boolean;
  batchIntervalMs: number;
}

export function useResourceEfficientRealtimeUX() {
  const computeConfig = useCallback((deviceClass: "high_end" | "mid_range" | "low_end", viewportWidth: number): RealtimeUXConfig => {
    if (deviceClass === "low_end") {
      return {
        virtualizedLists: true, lazyLoadCharts: true, deferredUpdates: true,
        skeletonLoading: true, progressiveImageLoading: true,
        maxVisibleCards: 4, chartResolution: "simplified",
        updateBatching: true, batchIntervalMs: 2000,
      };
    }
    if (deviceClass === "mid_range" || viewportWidth < 768) {
      return {
        virtualizedLists: true, lazyLoadCharts: true, deferredUpdates: false,
        skeletonLoading: true, progressiveImageLoading: true,
        maxVisibleCards: 8, chartResolution: "sampled",
        updateBatching: true, batchIntervalMs: 1000,
      };
    }
    return {
      virtualizedLists: false, lazyLoadCharts: false, deferredUpdates: false,
      skeletonLoading: false, progressiveImageLoading: false,
      maxVisibleCards: 20, chartResolution: "full",
      updateBatching: false, batchIntervalMs: 0,
    };
  }, []);

  const shouldDeferUpdate = useCallback((config: RealtimeUXConfig, lastUpdateMs: number): boolean => {
    if (!config.deferredUpdates) return false;
    return Date.now() - lastUpdateMs < config.batchIntervalMs;
  }, []);

  return { computeConfig, shouldDeferUpdate };
}

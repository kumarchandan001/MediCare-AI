/**
 * Hooks Barrel Export
 */
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop, useIsUltrawide, usePrefersReducedMotion, useIsTouch } from "./useMediaQuery";
export { useWebSocketInit, useWebSocketEvent, useConnectionStatus, useLiveMetrics, useStreamingAlerts } from "./useWebSocket";
export { useInterpolatedMetric, useInterpolatedValues, easings } from "./useInterpolatedMetric";
export { useThrottledValue, useThrottledStream, useAdaptiveRefreshRate } from "./useThrottledStream";
export { useDataFreshness, useFrequencyLimiter, useStreamPerformance } from "./useStreamSafety";
export type { DataFreshness, StreamPerformance } from "./useStreamSafety";
export { useAdaptiveCalmMode } from "./useAdaptiveCalmMode";
export type { CalmModeState } from "./useAdaptiveCalmMode";

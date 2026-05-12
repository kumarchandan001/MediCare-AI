/**
 * AdaptiveMobileStreaming — Manages adaptive data streaming for mobile
 * devices, adjusting quality and frequency based on network and battery.
 */
import { useCallback } from "react";

export interface StreamingConfig {
  updateIntervalMs: number;
  dataQuality: "full" | "reduced" | "minimal";
  batchSize: number;
  compressionEnabled: boolean;
  backgroundSyncEnabled: boolean;
}

export interface NetworkCondition {
  type: "wifi" | "4g" | "3g" | "2g" | "offline";
  downlinkMbps: number;
  rtt: number;
  saveData: boolean;
}

export function useAdaptiveMobileStreaming() {
  const detectNetwork = useCallback((): NetworkCondition => {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } })?.connection;
    return {
      type: (conn?.effectiveType as NetworkCondition["type"]) || "wifi",
      downlinkMbps: conn?.downlink || 10, rtt: conn?.rtt || 50,
      saveData: conn?.saveData || false,
    };
  }, []);

  const computeStreamingConfig = useCallback((network: NetworkCondition, batteryLevel: number | null): StreamingConfig => {
    const lowBattery = batteryLevel !== null && batteryLevel < 0.2;
    const poorNetwork = network.type === "2g" || network.type === "3g" || network.downlinkMbps < 1;
    if (network.type === "offline") {
      return { updateIntervalMs: 0, dataQuality: "minimal", batchSize: 0, compressionEnabled: true, backgroundSyncEnabled: false };
    }
    if (poorNetwork || lowBattery || network.saveData) {
      return { updateIntervalMs: 30000, dataQuality: "minimal", batchSize: 1, compressionEnabled: true, backgroundSyncEnabled: false };
    }
    if (network.type === "4g") {
      return { updateIntervalMs: 5000, dataQuality: "reduced", batchSize: 5, compressionEnabled: true, backgroundSyncEnabled: true };
    }
    return { updateIntervalMs: 2000, dataQuality: "full", batchSize: 10, compressionEnabled: false, backgroundSyncEnabled: true };
  }, []);

  return { detectNetwork, computeStreamingConfig };
}

/**
 * AdaptiveResourceManager — Dynamically manages CPU, memory, and network
 * resource allocation based on device capabilities and current load.
 */
import { useCallback, useMemo } from "react";

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  connectionType: "4g" | "3g" | "2g" | "wifi" | "ethernet" | "unknown";
  batteryLevel: number | null;
  isLowEndDevice: boolean;
  gpuAvailable: boolean;
}

export interface ResourceAllocation {
  maxConcurrentTasks: number;
  renderingQuality: "high" | "medium" | "low";
  animationsEnabled: boolean;
  prefetchingEnabled: boolean;
  realtimeUpdateInterval: number;
  maxCacheSize: number;
  wearableStreamQuality: "full" | "sampled" | "minimal";
}

export function useAdaptiveResourceManager() {
  const detectCapabilities = useCallback((): DeviceCapabilities => {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const conn = (nav as unknown as { connection?: { effectiveType?: string } })?.connection;
    const battery = null; // Battery API requires async — provide null as safe default
    return {
      cpuCores: nav?.hardwareConcurrency || 4,
      memoryGB: (nav as unknown as { deviceMemory?: number })?.deviceMemory || 4,
      connectionType: (conn?.effectiveType as DeviceCapabilities["connectionType"]) || "unknown",
      batteryLevel: battery,
      isLowEndDevice: (nav?.hardwareConcurrency || 4) <= 2 || ((nav as unknown as { deviceMemory?: number })?.deviceMemory || 4) <= 2,
      gpuAvailable: typeof OffscreenCanvas !== "undefined",
    };
  }, []);

  const capabilities = useMemo(() => detectCapabilities(), [detectCapabilities]);

  const computeAllocation = useCallback((caps: DeviceCapabilities, currentLoad: number = 0): ResourceAllocation => {
    const isConstrained = caps.isLowEndDevice || caps.connectionType === "2g" || caps.connectionType === "3g";
    const highLoad = currentLoad > 0.7;

    return {
      maxConcurrentTasks: isConstrained ? 2 : highLoad ? 3 : Math.min(caps.cpuCores, 8),
      renderingQuality: isConstrained ? "low" : highLoad ? "medium" : "high",
      animationsEnabled: !isConstrained && !highLoad,
      prefetchingEnabled: !isConstrained && caps.connectionType !== "3g",
      realtimeUpdateInterval: isConstrained ? 5000 : highLoad ? 2000 : 1000,
      maxCacheSize: isConstrained ? 25 : 100,
      wearableStreamQuality: isConstrained ? "minimal" : highLoad ? "sampled" : "full",
    };
  }, []);

  const getAllocation = useCallback((currentLoad = 0): ResourceAllocation => {
    return computeAllocation(capabilities, currentLoad);
  }, [capabilities, computeAllocation]);

  return { detectCapabilities, computeAllocation, getAllocation, capabilities };
}

/**
 * BatteryAwareMonitoring — Adjusts health monitoring intensity based
 * on device battery state to extend usage during low-power conditions.
 */
import { useCallback, useRef, useEffect, useState } from "react";

export interface BatteryState {
  level: number;        // 0-1
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
}

export interface MonitoringAdjustment {
  wearablePollingMs: number;
  dashboardRefreshMs: number;
  backgroundTasksEnabled: boolean;
  animationsEnabled: boolean;
  prefetchEnabled: boolean;
  realtimeStreaming: boolean;
  mode: "full" | "balanced" | "conservation" | "critical";
}

export function useBatteryAwareMonitoring() {
  const [battery, setBattery] = useState<BatteryState>({ level: 1, charging: false, chargingTime: null, dischargingTime: null });
  const batteryRef = useRef<BatteryState>(battery);

  useEffect(() => {
    const nav = navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number; addEventListener: (e: string, cb: () => void) => void }> };
    if (nav.getBattery) {
      nav.getBattery().then(batt => {
        const update = () => {
          const state = { level: batt.level, charging: batt.charging, chargingTime: batt.chargingTime || null, dischargingTime: batt.dischargingTime || null };
          setBattery(state);
          batteryRef.current = state;
        };
        update();
        batt.addEventListener("levelchange", update);
        batt.addEventListener("chargingchange", update);
      }).catch(() => { /* Battery API not available */ });
    }
  }, []);

  const getAdjustment = useCallback((batteryState?: BatteryState): MonitoringAdjustment => {
    const b = batteryState || batteryRef.current;
    if (b.charging) {
      return { wearablePollingMs: 2000, dashboardRefreshMs: 5000, backgroundTasksEnabled: true, animationsEnabled: true, prefetchEnabled: true, realtimeStreaming: true, mode: "full" };
    }
    if (b.level > 0.5) {
      return { wearablePollingMs: 5000, dashboardRefreshMs: 10000, backgroundTasksEnabled: true, animationsEnabled: true, prefetchEnabled: true, realtimeStreaming: true, mode: "balanced" };
    }
    if (b.level > 0.2) {
      return { wearablePollingMs: 15000, dashboardRefreshMs: 30000, backgroundTasksEnabled: false, animationsEnabled: false, prefetchEnabled: false, realtimeStreaming: true, mode: "conservation" };
    }
    return { wearablePollingMs: 60000, dashboardRefreshMs: 60000, backgroundTasksEnabled: false, animationsEnabled: false, prefetchEnabled: false, realtimeStreaming: false, mode: "critical" };
  }, []);

  return { battery, getAdjustment };
}

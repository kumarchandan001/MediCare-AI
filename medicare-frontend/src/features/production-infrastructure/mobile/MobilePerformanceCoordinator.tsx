/**
 * MobilePerformanceCoordinator — Optimizes platform behavior for mobile
 * devices with adaptive rendering, touch optimization, and viewport management.
 */
import { useCallback, useMemo } from "react";

export interface MobilePerformanceProfile {
  deviceClass: "high_end" | "mid_range" | "low_end";
  screenSize: "small" | "medium" | "large";
  touchOptimized: boolean;
  reducedMotion: boolean;
  dataConservation: boolean;
  renderingBudget: { maxFPS: number; maxComponents: number; maxAnimations: number };
  networkStrategy: { prefetchEnabled: boolean; imageQuality: "high" | "medium" | "low"; batchRequests: boolean };
}

export function useMobilePerformanceCoordinator() {
  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  const detectProfile = useCallback((): MobilePerformanceProfile => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    const cores = navigator?.hardwareConcurrency || 4;
    const mem = (navigator as unknown as { deviceMemory?: number })?.deviceMemory || 4;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dataSaver = (navigator as unknown as { connection?: { saveData?: boolean } })?.connection?.saveData || false;

    let deviceClass: MobilePerformanceProfile["deviceClass"] = "high_end";
    if (cores <= 2 || mem <= 2) deviceClass = "low_end";
    else if (cores <= 4 || mem <= 4) deviceClass = "mid_range";

    const screenSize = width < 375 ? "small" as const : width < 768 ? "medium" as const : "large" as const;

    return {
      deviceClass, screenSize, touchOptimized: width < 1024, reducedMotion, dataConservation: dataSaver,
      renderingBudget: {
        maxFPS: deviceClass === "low_end" ? 30 : 60,
        maxComponents: deviceClass === "low_end" ? 50 : deviceClass === "mid_range" ? 100 : 200,
        maxAnimations: deviceClass === "low_end" ? 2 : deviceClass === "mid_range" ? 5 : 10,
      },
      networkStrategy: {
        prefetchEnabled: deviceClass !== "low_end" && !dataSaver,
        imageQuality: dataSaver ? "low" : deviceClass === "low_end" ? "medium" : "high",
        batchRequests: deviceClass === "low_end",
      },
    };
  }, []);

  const profile = useMemo(() => detectProfile(), [detectProfile]);

  return { isMobile, profile, detectProfile };
}

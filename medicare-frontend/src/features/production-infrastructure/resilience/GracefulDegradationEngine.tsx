/**
 * GracefulDegradationEngine — Manages progressive feature degradation
 * when system resources are constrained, ensuring core health features
 * remain available even during partial outages.
 */
import { useCallback } from "react";

export type FeatureTier = "critical" | "essential" | "enhanced" | "optional";

export interface DegradableFeature {
  name: string;
  tier: FeatureTier;
  enabled: boolean;
  resourceCost: number; // 0-100
  fallbackBehavior: string;
  dependencies: string[];
}

export interface DegradationState {
  level: "none" | "light" | "moderate" | "heavy" | "emergency";
  activeFeatures: DegradableFeature[];
  disabledFeatures: DegradableFeature[];
  resourceUtilization: number;
  reason: string;
}

const TIER_PRIORITY: Record<FeatureTier, number> = { critical: 0, essential: 1, enhanced: 2, optional: 3 };

export function useGracefulDegradationEngine() {
  const computeDegradation = useCallback((
    features: DegradableFeature[], availableResources: number
  ): DegradationState => {
    const sorted = [...features].sort((a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier]);
    const active: DegradableFeature[] = [];
    const disabled: DegradableFeature[] = [];
    let used = 0;

    for (const f of sorted) {
      if (used + f.resourceCost <= availableResources) {
        active.push({ ...f, enabled: true });
        used += f.resourceCost;
      } else {
        disabled.push({ ...f, enabled: false });
      }
    }

    let level: DegradationState["level"] = "none";
    const disabledTiers = disabled.map(f => f.tier);
    if (disabledTiers.includes("critical")) level = "emergency";
    else if (disabledTiers.includes("essential")) level = "heavy";
    else if (disabledTiers.includes("enhanced")) level = "moderate";
    else if (disabled.length > 0) level = "light";

    return {
      level, activeFeatures: active, disabledFeatures: disabled,
      resourceUtilization: used,
      reason: disabled.length > 0
        ? `${disabled.length} features degraded to maintain ${active.length} core features within resource budget`
        : "All features operating normally",
    };
  }, []);

  const getDefaultFeatures = useCallback((): DegradableFeature[] => [
    { name: "Health Monitoring", tier: "critical", enabled: true, resourceCost: 15, fallbackBehavior: "Reduced update frequency", dependencies: [] },
    { name: "Emergency Alerts", tier: "critical", enabled: true, resourceCost: 10, fallbackBehavior: "Static alert display", dependencies: [] },
    { name: "Wearable Streaming", tier: "essential", enabled: true, resourceCost: 20, fallbackBehavior: "Batch sync every 5 minutes", dependencies: ["Health Monitoring"] },
    { name: "Realtime Dashboard", tier: "essential", enabled: true, resourceCost: 15, fallbackBehavior: "Cached dashboard with manual refresh", dependencies: [] },
    { name: "Predictive Intelligence", tier: "enhanced", enabled: true, resourceCost: 20, fallbackBehavior: "Pre-computed predictions only", dependencies: ["Health Monitoring"] },
    { name: "Animations & Transitions", tier: "optional", enabled: true, resourceCost: 10, fallbackBehavior: "Static UI", dependencies: [] },
    { name: "Background Analytics", tier: "optional", enabled: true, resourceCost: 10, fallbackBehavior: "Deferred to next session", dependencies: [] },
  ], []);

  return { computeDegradation, getDefaultFeatures };
}

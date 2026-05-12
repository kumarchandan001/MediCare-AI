/**
 * HealthIntelligenceCoordinator — Determines which health subsystems
 * to activate based on current context: active investigation, passive
 * monitoring, wellness check-in, or preventive scan. Coordinates
 * intelligence priorities so the system feels orchestrated, not fragmented.
 */
import { useCallback } from "react";
import type { HealthDomain, DomainSignal } from "./UnifiedHealthEngine";

// ── Context Modes ────────────────────────
export type IntelligenceMode =
  | "active_investigation"  // User is in a clinical investigation
  | "passive_monitoring"    // Background health monitoring
  | "wellness_checkin"      // User initiated wellness review
  | "preventive_scan"       // Periodic preventive health analysis
  | "recovery_tracking"     // Active recovery monitoring
  | "idle";                 // No active health activity

export interface IntelligenceContext {
  mode: IntelligenceMode;
  prioritizedDomains: HealthDomain[];
  suppressedDomains: HealthDomain[];
  refreshInterval: number;   // ms
  insightDepth: "surface" | "standard" | "deep";
  narrativeStyle: "brief" | "conversational" | "detailed";
}

export interface CoordinationInput {
  hasActiveInvestigation: boolean;
  hasActiveRecovery: boolean;
  isWellnessCheckIn: boolean;
  lastPreventiveScan: number | null;
  activeDomains: HealthDomain[];
  userEngagementLevel: "low" | "moderate" | "high";
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
}

export function useHealthIntelligenceCoordinator() {
  /**
   * Determine the current intelligence context based on user activity.
   */
  const coordinate = useCallback((input: CoordinationInput): IntelligenceContext => {
    // Priority 1: Active clinical investigation
    if (input.hasActiveInvestigation) {
      return {
        mode: "active_investigation",
        prioritizedDomains: ["disease_intelligence", "wearable", "recovery", "medication"],
        suppressedDomains: ["coaching", "nutrition"],  // Don't distract during investigation
        refreshInterval: 5_000,
        insightDepth: "deep",
        narrativeStyle: "detailed",
      };
    }

    // Priority 2: Active recovery tracking
    if (input.hasActiveRecovery) {
      return {
        mode: "recovery_tracking",
        prioritizedDomains: ["recovery", "medication", "sleep", "activity", "wearable"],
        suppressedDomains: [],
        refreshInterval: 30_000,
        insightDepth: "standard",
        narrativeStyle: "conversational",
      };
    }

    // Priority 3: User-initiated wellness check-in
    if (input.isWellnessCheckIn) {
      return {
        mode: "wellness_checkin",
        prioritizedDomains: ["wellness", "sleep", "activity", "emotional", "nutrition", "preventive"],
        suppressedDomains: [],
        refreshInterval: 60_000,
        insightDepth: "standard",
        narrativeStyle: "conversational",
      };
    }

    // Priority 4: Periodic preventive scan
    const hoursSinceLastScan = input.lastPreventiveScan
      ? (Date.now() - input.lastPreventiveScan) / (1000 * 60 * 60)
      : Infinity;
    if (hoursSinceLastScan > 24) {
      return {
        mode: "preventive_scan",
        prioritizedDomains: ["preventive", "wellness", "sleep", "activity", "emotional"],
        suppressedDomains: [],
        refreshInterval: 300_000,
        insightDepth: "surface",
        narrativeStyle: "brief",
      };
    }

    // Default: Passive monitoring
    return {
      mode: "passive_monitoring",
      prioritizedDomains: getPassiveMonitoringPriorities(input.timeOfDay),
      suppressedDomains: [],
      refreshInterval: 120_000,
      insightDepth: "surface",
      narrativeStyle: "brief",
    };
  }, []);

  /**
   * Determine if a domain should be actively refreshed in the current context.
   */
  const shouldRefreshDomain = useCallback((
    domain: HealthDomain,
    context: IntelligenceContext,
    lastRefresh: number
  ): boolean => {
    if (context.suppressedDomains.includes(domain)) return false;
    const elapsed = Date.now() - lastRefresh;
    const isPrioritized = context.prioritizedDomains.includes(domain);
    const interval = isPrioritized ? context.refreshInterval : context.refreshInterval * 3;
    return elapsed > interval;
  }, []);

  /**
   * Get a human-readable description of the current mode.
   */
  const getModeDescription = useCallback((mode: IntelligenceMode): string => {
    const descriptions: Record<IntelligenceMode, string> = {
      active_investigation: "Focused on your clinical investigation — all health systems are actively contributing.",
      passive_monitoring: "Quietly monitoring your health in the background.",
      wellness_checkin: "Reviewing your overall wellness across all health dimensions.",
      preventive_scan: "Running a preventive health scan to catch early signals.",
      recovery_tracking: "Actively tracking your recovery — sleep, medication, and activity are prioritized.",
      idle: "Health systems are standing by, ready when you need them.",
    };
    return descriptions[mode];
  }, []);

  return { coordinate, shouldRefreshDomain, getModeDescription };
}

// ── Time-aware passive monitoring priorities ──
function getPassiveMonitoringPriorities(timeOfDay: string): HealthDomain[] {
  switch (timeOfDay) {
    case "morning":
      return ["sleep", "wellness", "activity", "medication", "preventive"];
    case "afternoon":
      return ["activity", "wellness", "wearable", "emotional"];
    case "evening":
      return ["wellness", "emotional", "nutrition", "recovery"];
    case "night":
      return ["sleep", "emotional", "recovery"];
    default:
      return ["wellness", "wearable", "sleep", "activity"];
  }
}

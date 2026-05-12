/**
 * HealthOperatingSystem — Root React component that wraps the entire
 * Unified Personal Health OS. Provides UnifiedHealthStateProvider
 * context and initializes the cross-system orchestrator. This is the
 * single entry point for the health ecosystem layer.
 *
 * Architecture: HealthOperatingSystem wraps all children with unified
 * health context. It sits ABOVE the clinical workspace in the provider
 * hierarchy so all features can access cross-domain health state.
 */
import React, { useEffect, useCallback, useRef } from "react";
import UnifiedHealthStateProvider, { useUnifiedHealthContext } from "./UnifiedHealthStateProvider";
import { useCrossSystemOrchestrator } from "./CrossSystemOrchestrator";
import { useHealthIntelligenceCoordinator } from "./HealthIntelligenceCoordinator";
import type { HealthDomain, DomainSignal } from "./UnifiedHealthEngine";
import type { IntelligenceContext } from "./HealthIntelligenceCoordinator";

// ── Internal Orchestration Layer ─────────
function HealthOSOrchestrationLayer({ children }: { children: React.ReactNode }) {
  const healthCtx = useUnifiedHealthContext();
  const orchestrator = useCrossSystemOrchestrator();
  const coordinator = useHealthIntelligenceCoordinator();
  const lastContextRef = useRef<IntelligenceContext | null>(null);

  // Coordinate intelligence mode based on domain signals
  useEffect(() => {
    const context = coordinator.coordinate({
      hasActiveInvestigation: healthCtx.domainSignals.some(
        s => s.domain === "disease_intelligence" && Date.now() - s.lastUpdated < 300_000
      ),
      hasActiveRecovery: healthCtx.domainSignals.some(
        s => s.domain === "recovery" && s.trend !== "stable" && s.score < 70
      ),
      isWellnessCheckIn: false,
      lastPreventiveScan: null,
      activeDomains: healthCtx.config.activeDomains,
      userEngagementLevel: "moderate",
      timeOfDay: getTimeOfDay(),
    });

    lastContextRef.current = context;
  }, [healthCtx.domainSignals, healthCtx.config.activeDomains, coordinator]);

  // Propagate domain changes through the influence graph
  useEffect(() => {
    if (healthCtx.domainSignals.length === 0) return;

    // Find the most recently updated domain
    const mostRecent = [...healthCtx.domainSignals].sort(
      (a, b) => b.lastUpdated - a.lastUpdated
    )[0];

    if (mostRecent && Date.now() - mostRecent.lastUpdated < 2000) {
      const result = orchestrator.propagateEvent({
        id: `evt-${Date.now()}`,
        sourceDomain: mostRecent.domain,
        eventType: "signal_update",
        payload: { newScore: mostRecent.score, trend: mostRecent.trend },
        timestamp: Date.now(),
      });

      // Apply adjustments to affected domains (soft influence, not overwrite)
      for (const adj of result.adjustments) {
        const existing = healthCtx.domainSignals.find(s => s.domain === adj.targetDomain);
        if (existing && adj.adjustmentType === "score_modifier") {
          const adjusted: DomainSignal = {
            ...existing,
            score: Math.max(0, Math.min(100, existing.score + adj.value)),
            lastUpdated: Date.now(),
          };
          // Only apply if the adjustment is meaningful
          if (Math.abs(adj.value) >= 3) {
            healthCtx.updateDomainSignal(adjusted);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthCtx.domainSignals.length]);

  // Seed default domain signals on first mount (if empty)
  useEffect(() => {
    if (healthCtx.domainSignals.length === 0) {
      const defaultSignals: DomainSignal[] = [
        { domain: "wellness", score: 65, trend: "stable", confidence: 50, lastUpdated: Date.now(), alerts: [] },
        { domain: "sleep", score: 60, trend: "unknown", confidence: 30, lastUpdated: Date.now(), alerts: [] },
        { domain: "activity", score: 55, trend: "unknown", confidence: 30, lastUpdated: Date.now(), alerts: [] },
        { domain: "emotional", score: 70, trend: "stable", confidence: 40, lastUpdated: Date.now(), alerts: [] },
      ];
      for (const signal of defaultSignals) {
        healthCtx.updateDomainSignal(signal);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

// ── Main Health Operating System ─────────
export default function HealthOperatingSystem({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedHealthStateProvider>
      <HealthOSOrchestrationLayer>
        {children}
      </HealthOSOrchestrationLayer>
    </UnifiedHealthStateProvider>
  );
}

// ── Utility ──────────────────────────────
function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

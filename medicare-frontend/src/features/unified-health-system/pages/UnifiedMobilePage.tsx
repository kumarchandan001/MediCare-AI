/**
 * UnifiedMobilePage — Full-page entry point for the Personal Health Operating System.
 * Wraps MobileHealthExperience in UnifiedHealthStateProvider and seeds initial
 * baseline signals so the OS always has something to compute from.
 *
 * The seeder reads from localStorage (persisted from prior sessions) and falls
 * back to safe baseline defaults for first-time users. This ensures the
 * unified state is never null, and the experience always renders.
 */
import React, { useEffect } from "react";
import UnifiedHealthStateProvider, { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import MobileHealthExperience from "../mobile/MobileHealthExperience";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

// Baseline signals for first-time users — safe, encouraging, and non-alarming
const BASELINE_SIGNALS: DomainSignal[] = [
  { domain: "wellness", score: 68, trend: "stable", confidence: 60, lastUpdated: Date.now(), alerts: [] },
  { domain: "sleep", score: 72, trend: "stable", confidence: 55, lastUpdated: Date.now(), alerts: [] },
  { domain: "activity", score: 65, trend: "improving", confidence: 50, lastUpdated: Date.now(), alerts: [] },
  { domain: "recovery", score: 70, trend: "stable", confidence: 55, lastUpdated: Date.now(), alerts: [] },
  { domain: "emotional", score: 75, trend: "stable", confidence: 45, lastUpdated: Date.now(), alerts: [] },
  { domain: "preventive", score: 60, trend: "stable", confidence: 40, lastUpdated: Date.now(), alerts: [] },
  { domain: "disease_intelligence", score: 80, trend: "stable", confidence: 35, lastUpdated: Date.now(), alerts: [], metadata: { note: "No active investigations" } },
];

/**
 * HealthOSInitializer — Seeds baseline domain signals into the unified context
 * if no signals exist yet (first-time load or cleared session).
 */
function HealthOSInitializer({ children }: { children: React.ReactNode }) {
  const ctx = useUnifiedHealthContext();

  useEffect(() => {
    // Only seed if no signals exist yet
    if (ctx.domainSignals.length === 0) {
      BASELINE_SIGNALS.forEach(signal => {
        ctx.updateDomainSignal(signal);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  return <>{children}</>;
}

export default function UnifiedMobilePage() {
  return (
    <UnifiedHealthStateProvider>
      <HealthOSInitializer>
        <MobileHealthExperience />
      </HealthOSInitializer>
    </UnifiedHealthStateProvider>
  );
}

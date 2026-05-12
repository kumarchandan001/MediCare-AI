/**
 * UnifiedHealthStateProvider — Central state context for the Unified
 * Personal Health Operating System. Merges all health domain states
 * into one queryable context. Uses localStorage for lightweight session
 * persistence & IndexedDB (via UnifiedHealthMemory) for longitudinal data.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { DomainSignal, UnifiedHealthState, HealthDomain, DomainAlert, CrossDomainInsight } from "./UnifiedHealthEngine";
import { useUnifiedHealthEngine } from "./UnifiedHealthEngine";

// ── Medication Consent ───────────────────
export interface MedicationConsent {
  consentGiven: boolean;
  consentTimestamp: number | null;
  trackingEnabled: boolean;
}

// ── Health Operating System Config ───────
export interface HealthSystemConfig {
  activeDomains: HealthDomain[];
  monitoringFrequency: "realtime" | "hourly" | "daily";
  preventiveAlertsEnabled: boolean;
  crossSystemInsightsEnabled: boolean;
  medicationConsent: MedicationConsent;
}

// ── Context Value ────────────────────────
export interface UnifiedHealthContextValue {
  // Core state
  unifiedState: UnifiedHealthState | null;
  isComputing: boolean;

  // Domain management
  domainSignals: DomainSignal[];
  updateDomainSignal: (signal: DomainSignal) => void;
  removeDomain: (domain: HealthDomain) => void;
  recompute: () => void;

  // Alerts
  activeAlerts: DomainAlert[];
  dismissAlert: (alertIndex: number) => void;

  // Cross-domain insights
  crossDomainInsights: CrossDomainInsight[];

  // Configuration
  config: HealthSystemConfig;
  updateConfig: (update: Partial<HealthSystemConfig>) => void;

  // Medication consent
  grantMedicationConsent: () => void;
  revokeMedicationConsent: () => void;

  // Health narrative
  healthNarrative: string;
}

const SESSION_KEY = "medicare_unified_health_session";

const defaultConfig: HealthSystemConfig = {
  activeDomains: ["disease_intelligence", "wearable", "recovery", "sleep", "activity", "wellness", "emotional"],
  monitoringFrequency: "hourly",
  preventiveAlertsEnabled: true,
  crossSystemInsightsEnabled: true,
  medicationConsent: { consentGiven: false, consentTimestamp: null, trackingEnabled: false },
};

function loadSessionState(): { config: HealthSystemConfig; signals: DomainSignal[] } {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        config: { ...defaultConfig, ...parsed.config },
        signals: parsed.signals || [],
      };
    }
  } catch { /* ignore */ }
  return { config: defaultConfig, signals: [] };
}

const UnifiedHealthContext = createContext<UnifiedHealthContextValue | null>(null);

export function useUnifiedHealthContext() {
  const ctx = useContext(UnifiedHealthContext);
  if (!ctx) throw new Error("useUnifiedHealthContext must be used inside UnifiedHealthStateProvider");
  return ctx;
}

export default function UnifiedHealthStateProvider({ children }: { children: React.ReactNode }) {
  const engine = useUnifiedHealthEngine();
  const initial = useMemo(() => loadSessionState(), []);

  const [domainSignals, setDomainSignals] = useState<DomainSignal[]>(initial.signals);
  const [config, setConfig] = useState<HealthSystemConfig>(initial.config);
  const [unifiedState, setUnifiedState] = useState<UnifiedHealthState | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  // Persist lightweight session state
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        config,
        signals: domainSignals.slice(-20), // Keep recent signals only
      }));
    } catch { /* storage full */ }
  }, [config, domainSignals]);

  // Recompute unified state when signals change
  const recompute = useCallback(() => {
    if (domainSignals.length === 0) {
      setUnifiedState(null);
      return;
    }
    setIsComputing(true);
    try {
      const state = engine.computeUnifiedState(domainSignals);
      setUnifiedState(state);
    } finally {
      setIsComputing(false);
    }
  }, [domainSignals, engine]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const updateDomainSignal = useCallback((signal: DomainSignal) => {
    setDomainSignals(prev => {
      const existing = prev.findIndex(s => s.domain === signal.domain);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...signal, lastUpdated: Date.now() };
        return updated;
      }
      return [...prev, { ...signal, lastUpdated: Date.now() }];
    });
  }, []);

  const removeDomain = useCallback((domain: HealthDomain) => {
    setDomainSignals(prev => prev.filter(s => s.domain !== domain));
  }, []);

  const dismissAlert = useCallback((alertIndex: number) => {
    setDismissedAlerts(prev => new Set([...prev, alertIndex]));
  }, []);

  const updateConfig = useCallback((update: Partial<HealthSystemConfig>) => {
    setConfig(prev => ({ ...prev, ...update }));
  }, []);

  const grantMedicationConsent = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      medicationConsent: { consentGiven: true, consentTimestamp: Date.now(), trackingEnabled: true },
      activeDomains: prev.activeDomains.includes("medication")
        ? prev.activeDomains
        : [...prev.activeDomains, "medication"],
    }));
  }, []);

  const revokeMedicationConsent = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      medicationConsent: { consentGiven: false, consentTimestamp: null, trackingEnabled: false },
      activeDomains: prev.activeDomains.filter(d => d !== "medication"),
    }));
    setDomainSignals(prev => prev.filter(s => s.domain !== "medication"));
  }, []);

  const activeAlerts = useMemo(() =>
    (unifiedState?.activeAlerts || []).filter((_, i) => !dismissedAlerts.has(i)),
  [unifiedState?.activeAlerts, dismissedAlerts]);

  const value = useMemo<UnifiedHealthContextValue>(() => ({
    unifiedState,
    isComputing,
    domainSignals,
    updateDomainSignal,
    removeDomain,
    recompute,
    activeAlerts,
    dismissAlert,
    crossDomainInsights: unifiedState?.crossDomainInsights || [],
    config,
    updateConfig,
    grantMedicationConsent,
    revokeMedicationConsent,
    healthNarrative: unifiedState?.healthNarrative || "",
  }), [
    unifiedState, isComputing, domainSignals, updateDomainSignal,
    removeDomain, recompute, activeAlerts, dismissAlert, config,
    updateConfig, grantMedicationConsent, revokeMedicationConsent,
  ]);

  return <UnifiedHealthContext.Provider value={value}>{children}</UnifiedHealthContext.Provider>;
}

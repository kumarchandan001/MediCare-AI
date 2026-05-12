/**
 * InfrastructureStateProvider — Central state context for production
 * infrastructure. Provides infrastructure health, deployment status,
 * and operational metrics to the entire component tree.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useProductionInfrastructureEngine } from "./ProductionInfrastructureEngine";
import type { InfrastructureHealthReport, SubsystemHealth, InfraAlert, InfrastructureConfig, EnvironmentTier } from "./ProductionInfrastructureEngine";

export interface InfrastructureContextValue {
  healthReport: InfrastructureHealthReport | null;
  isHealthy: boolean;
  isDegraded: boolean;
  isCritical: boolean;
  environment: EnvironmentTier;
  subsystems: SubsystemHealth[];
  alerts: InfraAlert[];
  acknowledgeAlert: (id: string) => void;
  reportSubsystemHealth: (health: SubsystemHealth) => void;
  refreshHealth: () => void;
  uptime: number;
}

const InfrastructureContext = createContext<InfrastructureContextValue | null>(null);

export function useInfrastructureContext() {
  const ctx = useContext(InfrastructureContext);
  if (!ctx) throw new Error("useInfrastructureContext must be used inside InfrastructureStateProvider");
  return ctx;
}

export default function InfrastructureStateProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<InfrastructureConfig>;
}) {
  const engine = useProductionInfrastructureEngine(config);
  const [subsystems, setSubsystems] = useState<SubsystemHealth[]>([]);
  const [healthReport, setHealthReport] = useState<InfrastructureHealthReport | null>(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refreshHealth = useCallback(() => {
    const report = engine.evaluateHealth(subsystems);
    setHealthReport(report);
  }, [engine, subsystems]);

  useEffect(() => { refreshHealth(); }, [refreshHealth]);

  useEffect(() => {
    const interval = engine.getConfig().healthCheckIntervalMs;
    intervalRef.current = setInterval(refreshHealth, interval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refreshHealth, engine]);

  const reportSubsystemHealth = useCallback((health: SubsystemHealth) => {
    setSubsystems(prev => {
      const idx = prev.findIndex(s => s.name === health.name);
      if (idx >= 0) { const u = [...prev]; u[idx] = health; return u; }
      return [...prev, health];
    });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, id]));
  }, []);

  const alerts = useMemo(() =>
    (healthReport?.criticalAlerts || []).filter(a => !acknowledgedAlerts.has(a.id)),
    [healthReport, acknowledgedAlerts]
  );

  const value = useMemo<InfrastructureContextValue>(() => ({
    healthReport,
    isHealthy: healthReport?.status === "healthy",
    isDegraded: healthReport?.status === "degraded",
    isCritical: healthReport?.status === "critical",
    environment: engine.getConfig().environment,
    subsystems,
    alerts,
    acknowledgeAlert,
    reportSubsystemHealth,
    refreshHealth,
    uptime: engine.getUptime(),
  }), [healthReport, subsystems, alerts, acknowledgeAlert, reportSubsystemHealth, refreshHealth, engine]);

  return <InfrastructureContext.Provider value={value}>{children}</InfrastructureContext.Provider>;
}

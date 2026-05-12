/**
 * MedicalEcosystemStateProvider — Central state provider for healthcare
 * ecosystem integration, tracking all connected systems and data flows.
 */
import { useCallback, useRef } from "react";

export interface EcosystemState {
  integrationStatus: "initializing" | "partial" | "connected" | "degraded" | "offline";
  connectedSystems: number;
  activeDataFlows: number;
  pendingSync: number;
  lastGlobalSync: number | null;
  governanceCompliant: boolean;
  ecosystemVersion: string;
}

export interface DataFlowMetric {
  source: string;
  destination: string;
  recordsTransferred: number;
  lastTransfer: number;
  errorRate: number;
  latencyMs: number;
}

export function useMedicalEcosystemStateProvider() {
  const state = useRef<EcosystemState>({
    integrationStatus: "initializing", connectedSystems: 0, activeDataFlows: 0,
    pendingSync: 0, lastGlobalSync: null, governanceCompliant: true, ecosystemVersion: "10.0.0-alpha",
  });
  const flows = useRef<DataFlowMetric[]>([]);

  const updateState = useCallback((partial: Partial<EcosystemState>): EcosystemState => {
    state.current = { ...state.current, ...partial };
    return state.current;
  }, []);

  const recordDataFlow = useCallback((flow: DataFlowMetric): void => {
    flows.current = [...flows.current.slice(-199), flow];
  }, []);

  const getState = useCallback((): EcosystemState => ({ ...state.current }), []);

  const getFlowHealth = useCallback((): { healthy: number; degraded: number; failed: number } => {
    const recent = flows.current.filter(f => Date.now() - f.lastTransfer < 3600000);
    return {
      healthy: recent.filter(f => f.errorRate < 1).length,
      degraded: recent.filter(f => f.errorRate >= 1 && f.errorRate < 10).length,
      failed: recent.filter(f => f.errorRate >= 10).length,
    };
  }, []);

  return { updateState, recordDataFlow, getState, getFlowHealth };
}

/**
 * UnifiedClinicalWorkspace — Main entry point for the Disease Intelligence Experience.
 * Wraps everything in GovernanceStateProvider → CompanionStateProvider →
 * TemporalHealthStateProvider → InvestigationStateProvider
 * and mounts the ClinicalWorkspaceShell + SessionContinuityRecovery.
 */
import { useCallback } from "react";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import CompanionStateProvider from "@/features/health-companion/CompanionStateProvider";
import TemporalHealthStateProvider from "@/features/longitudinal-health/TemporalHealthStateProvider";
import InvestigationStateProvider from "./InvestigationStateProvider";
import GovernanceStateProvider from "@/features/clinical-governance/GovernanceStateProvider";
import ClinicalScenarioSimulator from "@/features/clinical-realism/simulator/ClinicalScenarioSimulator";
import SessionContinuityRecovery from "@/features/clinical-governance/resilience/SessionContinuityRecovery";
import ClinicalWorkspaceShell from "./ClinicalWorkspaceShell";
import "./unified-workspace.css";

export default function UnifiedClinicalWorkspace() {
  const handleRecover = useCallback((checkpoint: any) => {
    console.log("[Governance] Recovering investigation from checkpoint:", checkpoint);
    // Recovery data will be consumed by InvestigationStateProvider
  }, []);

  const handleDismissRecovery = useCallback(() => {
    console.log("[Governance] Recovery dismissed — starting fresh.");
  }, []);

  return (
    <ErrorBoundary>
      <GovernanceStateProvider>
        <CompanionStateProvider>
          <TemporalHealthStateProvider>
            <InvestigationStateProvider>
              <SessionContinuityRecovery
                onRecover={handleRecover}
                onDismiss={handleDismissRecovery}
              />
              <ClinicalScenarioSimulator />
              <ClinicalWorkspaceShell />
            </InvestigationStateProvider>
          </TemporalHealthStateProvider>
        </CompanionStateProvider>
      </GovernanceStateProvider>
    </ErrorBoundary>
  );
}

/**
 * ClinicalInterviewPage — Full clinical investigation entry point that
 * wraps the interview workspace in all required providers:
 * GovernanceStateProvider → CompanionStateProvider → TemporalHealthStateProvider
 * → InvestigationStateProvider
 *
 * This ensures:
 * - Governance safeguards are active during the investigation
 * - Companion emotional safety filters are enabled
 * - Temporal health continuity is maintained
 * - Investigation state (session, conversation, results) is properly managed
 */
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import GovernanceStateProvider from "@/features/clinical-governance/GovernanceStateProvider";
import CompanionStateProvider from "@/features/health-companion/CompanionStateProvider";
import TemporalHealthStateProvider from "@/features/longitudinal-health/TemporalHealthStateProvider";
import InvestigationStateProvider from "@/features/unified-clinical-workspace/InvestigationStateProvider";
import SessionContinuityRecovery from "@/features/clinical-governance/resilience/SessionContinuityRecovery";
import ClinicalInterviewWorkspace from "../components/ClinicalInterviewWorkspace";
import { useCallback } from "react";

export default function ClinicalInterviewPage() {
  const handleRecover = useCallback((checkpoint: any) => {
    console.log("[ClinicalInterview] Recovering from checkpoint:", checkpoint);
  }, []);

  const handleDismissRecovery = useCallback(() => {
    console.log("[ClinicalInterview] Recovery dismissed — starting fresh.");
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
              <div className="animate-page-in" style={{ padding: "0" }}>
                <ClinicalInterviewWorkspace />
              </div>
            </InvestigationStateProvider>
          </TemporalHealthStateProvider>
        </CompanionStateProvider>
      </GovernanceStateProvider>
    </ErrorBoundary>
  );
}

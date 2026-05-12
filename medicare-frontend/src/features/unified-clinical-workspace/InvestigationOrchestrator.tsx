/**
 * InvestigationOrchestrator — The brain of the workspace.
 * Binds InvestigationStateProvider, ClinicalSessionManager, and
 * InvestigationFlowController into ONE continuous investigation engine.
 */
import InvestigationFlowController from "./InvestigationFlowController";
import ManualSymptomRefinementPanel from "./components/ManualSymptomRefinementPanel";
import "./unified-workspace.css";

export default function InvestigationOrchestrator() {
  return (
    <div className="ucw-workspace animate-page-in">
      {/* Flow controller handles phase transitions */}
      <InvestigationFlowController />

      {/* Manual symptom refinement slide-out (global) */}
      <ManualSymptomRefinementPanel />
    </div>
  );
}

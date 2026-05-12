import React from "react";
import { differentialReasoningService } from "../api/differentialReasoning.service";
import type { DifferentialState } from "../api/differentialReasoning.service";
import HypothesisEvolutionPanel from "./HypothesisEvolutionPanel";
import EvidenceWeightingView from "./EvidenceWeightingView";
import DifferentialComparisonCards from "./DifferentialComparisonCards";
import ExclusionReasoningPanel from "./ExclusionReasoningPanel";
import ClinicalAmbiguityPanel from "./ClinicalAmbiguityPanel";
import ConfidenceEvolutionGraph from "./ConfidenceEvolutionGraph";
import MultiConditionReasoningView from "./MultiConditionReasoningView";

interface Props {
  sessionId: string | null;
}

export default function DifferentialDiagnosisWorkspace({ sessionId }: Props) {
  const [state, setState] = React.useState<DifferentialState | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"hypotheses" | "evidence" | "uncertainty">("hypotheses");
  const [collapsed, setCollapsed] = React.useState(false);

  // Fetch differential state whenever sessionId changes or on interval
  const fetchState = React.useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await differentialReasoningService.getDifferentialState(sessionId);
      const data = (res as any)?.data || res;
      setState(data);
    } catch {
      // Silently handle — differential state may not be available yet
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Expose a refresh method for the parent
  React.useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(fetchState, 8000);
    return () => clearInterval(interval);
  }, [sessionId, fetchState]);

  if (!sessionId) return null;

  if (!state && !loading) {
    return (
      <div className="dr-workspace-empty">
        <p>Differential reasoning will appear as the investigation progresses.</p>
      </div>
    );
  }

  const tabs = [
    { key: "hypotheses" as const, label: "Hypotheses" },
    { key: "evidence" as const, label: "Evidence" },
    { key: "uncertainty" as const, label: "Uncertainty" },
  ];

  return (
    <div className={`dr-workspace ${collapsed ? "dr-collapsed" : ""}`}>
      {/* Collapse toggle (mobile) */}
      <button className="dr-collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "▶ Show Reasoning" : "▼ Differential Reasoning"}
      </button>

      {!collapsed && (
        <>
          {/* Strategy banner */}
          {state?.strategy && (
            <div className={`dr-strategy-banner dr-strategy-${state.strategy.strategy}`}>
              <span className="dr-strategy-icon">
                {state.strategy.strategy === "escalation_targeted" ? "🚨" :
                 state.strategy.strategy === "ambiguity_targeted" ? "🔍" :
                 state.strategy.strategy === "exclusion_targeted" ? "✂️" : "🎯"}
              </span>
              <span className="dr-strategy-text">{state.strategy.reason}</span>
            </div>
          )}

          {/* Tab navigation */}
          <div className="dr-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`dr-tab ${activeTab === t.key ? "dr-tab-active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="dr-tab-content">
            {activeTab === "hypotheses" && state && (
              <>
                <HypothesisEvolutionPanel
                  hypotheses={state.hypotheses}
                  stability={state.stability}
                />
                <ConfidenceEvolutionGraph
                  evolution={state.evolution?.evolution || null}
                />
                <DifferentialComparisonCards comparisons={state.comparisons} />
                <ExclusionReasoningPanel exclusions={state.exclusions} />
                <MultiConditionReasoningView overlaps={state.overlaps} />
              </>
            )}

            {activeTab === "evidence" && state && (
              <EvidenceWeightingView evidence={state.weighted_evidence} />
            )}

            {activeTab === "uncertainty" && state && (
              <ClinicalAmbiguityPanel ambiguity={state.ambiguity} />
            )}
          </div>

          {/* Safety disclaimer */}
          <div className="dr-safety-footer">
            <p>
              This is an investigative reasoning tool — <strong>not a diagnosis</strong>.
              Always consult a healthcare professional for medical decisions.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

import React from "react";
import type {
  ReasoningChainData, EvidenceLandscapeData, ContradictionData,
  UncertaintyData, DecisionData, TrustIndicatorData, ReasoningStabilityData,
  InvestigationGraphData, ClinicalStoryData,
} from "../explainability.service";

import ClinicalNarrativeSummary from "./ClinicalNarrativeSummary";
import ReasoningStabilityView from "./ReasoningStabilityView";
import ClinicalTrustIndicators from "./ClinicalTrustIndicators";
import ReasoningChainViewer from "./ReasoningChainViewer";
import EvidenceTransparencyPanel from "./EvidenceTransparencyPanel";
import UncertaintyVisualizationPanel from "./UncertaintyVisualizationPanel";
import ContradictionAnalysisView from "./ContradictionAnalysisView";
import InvestigationPathwayGraph from "./InvestigationPathwayGraph";
import DecisionTransparencyPanel from "./DecisionTransparencyPanel";

interface Props {
  sessionId: string | null;
  story?: ClinicalStoryData | null;
  chain?: ReasoningChainData | null;
  landscape?: EvidenceLandscapeData | null;
  contradictions?: ContradictionData | null;
  uncertainty?: UncertaintyData | null;
  decisions?: DecisionData | null;
  trust?: TrustIndicatorData | null;
  stability?: ReasoningStabilityData | null;
  graph?: InvestigationGraphData | null;
}

type ViewTab = "narrative" | "evidence" | "reasoning" | "transparency";

export default function InvestigationWorkspace({
  sessionId, story, chain, landscape, contradictions,
  uncertainty, decisions, trust, stability, graph,
}: Props) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ViewTab>("narrative");

  if (!sessionId) return null;

  const hasAnyData = story || chain || landscape || trust;
  if (!hasAnyData) {
    return (
      <div className="ex-panel" style={{ textAlign: "center" }}>
        <p className="ex-dim">
          Clinical explainability will activate as the investigation progresses.
        </p>
      </div>
    );
  }

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "narrative", label: "Summary" },
    { key: "evidence", label: "Evidence" },
    { key: "reasoning", label: "Reasoning" },
    { key: "transparency", label: "Trust" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button className="ex-collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "\u25B6 Show Explainability" : "\u25BC Clinical Reasoning Transparency"}
      </button>

      {!collapsed && (
        <>
          {/* Stability always visible — quick reasoning health check */}
          <ReasoningStabilityView stability={stability || null} />

          {/* Tab navigation */}
          <div className="ex-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`ex-tab ${activeTab === t.key ? "ex-tab-active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* NARRATIVE TAB — Default focus: calm summaries */}
          {activeTab === "narrative" && (
            <>
              <ClinicalNarrativeSummary story={story || null} />
              <DecisionTransparencyPanel decisions={decisions || null} />
            </>
          )}

          {/* EVIDENCE TAB */}
          {activeTab === "evidence" && (
            <>
              <EvidenceTransparencyPanel landscape={landscape || null} />
              <ContradictionAnalysisView data={contradictions || null} />
              <UncertaintyVisualizationPanel uncertainty={uncertainty || null} />
            </>
          )}

          {/* REASONING TAB — Progressive disclosure */}
          {activeTab === "reasoning" && (
            <>
              <ReasoningChainViewer chain={chain || null} />
              <InvestigationPathwayGraph graph={graph || null} />
            </>
          )}

          {/* TRUST TAB */}
          {activeTab === "transparency" && (
            <ClinicalTrustIndicators trust={trust || null} />
          )}
        </>
      )}
    </div>
  );
}

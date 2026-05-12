import React from "react";
import type { GovernanceResult, EscalationData, HumanReviewData, EmotionalSafetyResult } from "../governance.service";

import TrustTransparencyPanel from "./TrustTransparencyPanel";
import InvestigationSafetyPanel from "./InvestigationSafetyPanel";
import EscalationGovernanceView from "./EscalationGovernanceView";
import EmotionalSafetyLayer from "./EmotionalSafetyLayer";
import InvestigationCompletenessView from "./InvestigationCompletenessView";
import UncertaintyGovernancePanel from "./UncertaintyGovernancePanel";
import HumanReviewRecommendationPanel from "./HumanReviewRecommendationPanel";

interface Props {
  sessionId: string | null;
  governance?: GovernanceResult | null;
  emotionalSafety?: EmotionalSafetyResult | null;
}

type GovTab = "safety" | "governance" | "review";

export default function GovernanceWorkspace({ sessionId, governance, emotionalSafety }: Props) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<GovTab>("safety");

  if (!sessionId) return null;

  if (!governance) {
    return (
      <div className="gov-panel" style={{ textAlign: "center" }}>
        <p className="gov-dim">
          Clinical governance will activate as the investigation progresses.
        </p>
      </div>
    );
  }

  const tabs: { key: GovTab; label: string }[] = [
    { key: "safety", label: "Safety" },
    { key: "governance", label: "Governance" },
    { key: "review", label: "Review" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button className="ex-collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "\u25B6 Show Governance" : "\u25BC Clinical Safety Governance"}
      </button>

      {!collapsed && (
        <>
          {/* Emotional Safety — always visible */}
          <EmotionalSafetyLayer emotionalSafety={emotionalSafety || null} />

          {/* Emergency banner — always visible when active */}
          {governance.escalation.is_emergency && (
            <EscalationGovernanceView escalation={governance.escalation} />
          )}

          {/* Human review — always visible when triggered */}
          <HumanReviewRecommendationPanel review={governance.human_review} />

          {/* Tab navigation */}
          <div className="gov-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`gov-tab ${activeTab === t.key ? "gov-tab-active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "safety" && (
            <>
              <InvestigationSafetyPanel governance={governance} />
              <EscalationGovernanceView escalation={governance.escalation} />
            </>
          )}

          {activeTab === "governance" && (
            <>
              <TrustTransparencyPanel governance={governance} />
              <UncertaintyGovernancePanel governance={governance} />
              <InvestigationCompletenessView governance={governance} />
            </>
          )}

          {activeTab === "review" && (
            <HumanReviewRecommendationPanel review={governance.human_review} />
          )}

          {/* Disclaimer — always present */}
          <div className="gov-disclaimer">
            <p>{governance.safety.disclaimer}</p>
          </div>
        </>
      )}
    </div>
  );
}

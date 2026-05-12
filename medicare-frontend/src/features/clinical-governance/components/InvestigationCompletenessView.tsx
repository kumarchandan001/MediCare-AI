import React from "react";
import type { GovernanceResult } from "../governance.service";

interface Props {
  governance: GovernanceResult | null;
}

export default function InvestigationCompletenessView({ governance }: Props) {
  if (!governance) return null;

  const uncertainty = governance.uncertainty;
  const ambiguity = governance.ambiguity;

  const items = [
    { label: "Uncertainty Checks", value: uncertainty.is_safe ? "Passed" : `${uncertainty.violations.length} issues`,
      color: uncertainty.is_safe ? "var(--gov-teal)" : "var(--gov-red)" },
    { label: "Ambiguity Level", value: ambiguity.ambiguity_level,
      color: ambiguity.ambiguity_score < 0.3 ? "var(--gov-teal)" : ambiguity.ambiguity_score < 0.6 ? "var(--gov-amber)" : "var(--gov-red)" },
    { label: "Warnings", value: `${uncertainty.warnings.length}`,
      color: uncertainty.warnings.length === 0 ? "var(--gov-teal)" : "var(--gov-amber)" },
    { label: "Preserving Ambiguity", value: ambiguity.should_preserve ? "Yes" : "No",
      color: "var(--gov-blue)" },
  ];

  return (
    <div className="gov-panel">
      <h3 className="gov-title">Investigation Completeness</h3>
      <div className="gov-completeness-grid">
        {items.map((item, i) => (
          <div key={i} className="gov-comp-item">
            <div className="gov-comp-value" style={{ color: item.color }}>{item.value}</div>
            <div className="gov-comp-label">{item.label}</div>
          </div>
        ))}
      </div>
      <p className="gov-dim" style={{ marginTop: "8px" }}>{ambiguity.summary}</p>
    </div>
  );
}

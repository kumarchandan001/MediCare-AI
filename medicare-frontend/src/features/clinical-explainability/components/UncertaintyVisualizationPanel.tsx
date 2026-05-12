import React from "react";
import type { UncertaintyData } from "../explainability.service";

interface Props {
  uncertainty: UncertaintyData | null;
}

export default function UncertaintyVisualizationPanel({ uncertainty }: Props) {
  if (!uncertainty) return null;

  const color = uncertainty.uncertainty_level === "low" ? "var(--ex-teal)"
    : uncertainty.uncertainty_level === "moderate" ? "var(--ex-amber)"
    : "var(--ex-red)";

  return (
    <div className="ex-panel">
      <h3 className="ex-title">
        Uncertainty
        <span className="ex-badge" style={{ background: `${color}15`, color }}>{uncertainty.uncertainty_level}</span>
      </h3>

      <div className="ex-unc-norm">{uncertainty.normalization_message}</div>

      {uncertainty.sources.length > 0 && (
        <div className="ex-unc-sources">
          {uncertainty.sources.map((s, i) => (
            <div key={i} className="ex-unc-source">{s.explanation}</div>
          ))}
        </div>
      )}
    </div>
  );
}

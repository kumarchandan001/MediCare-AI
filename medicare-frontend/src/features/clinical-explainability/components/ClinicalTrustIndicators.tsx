import React from "react";
import type { TrustIndicatorData } from "../explainability.service";

interface Props {
  trust: TrustIndicatorData | null;
}

export default function ClinicalTrustIndicators({ trust }: Props) {
  if (!trust) return null;

  const overallColor = trust.overall_trust > 0.7 ? "var(--ex-teal)"
    : trust.overall_trust > 0.45 ? "var(--ex-amber)" : "var(--ex-red)";

  return (
    <div className="ex-panel">
      <h3 className="ex-title">
        Trust Indicators
        <span className="ex-badge" style={{ background: `${overallColor}15`, color: overallColor }}>
          {Math.round(trust.overall_trust * 100)}%
        </span>
      </h3>

      <div className="ex-trust-grid">
        {trust.indicators.map((ind, i) => (
          <div key={i} className="ex-trust-card">
            <div className="ex-trust-value" style={{
              color: ind.status === "strong" || ind.status === "thorough" || ind.status === "reliable" || ind.status === "stable" || ind.status === "low"
                ? "var(--ex-teal)"
                : ind.status === "adequate" || ind.status === "progressing" || ind.status === "moderate" || ind.status === "adjusting"
                ? "var(--ex-amber)"
                : "var(--ex-red)"
            }}>
              {Math.round(ind.value * 100)}%
            </div>
            <div className="ex-trust-label">{ind.label}</div>
            <span className={`ex-trust-status ex-status-${ind.status}`}>{ind.status}</span>
          </div>
        ))}
      </div>

      <p className="ex-dim" style={{ marginTop: "8px" }}>{trust.summary}</p>
    </div>
  );
}

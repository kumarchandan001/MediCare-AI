import React from "react";
import type { WeightedEvidence } from "../api/differentialReasoning.service";

interface Props {
  evidence: WeightedEvidence | null;
}

const RELIABILITY_COLORS: Record<string, string> = {
  wearable_confirmed: "var(--dr-teal)",
  high_specificity: "var(--dr-blue)",
  self_reported: "var(--dr-text-dim)",
};

export default function EvidenceWeightingView({ evidence }: Props) {
  if (!evidence) return null;

  const details = evidence.details || [];

  return (
    <div className="dr-evidence-panel">
      <h3 className="dr-section-title">Evidence Quality</h3>

      {/* Summary badges */}
      <div className="dr-evidence-summary">
        {evidence.strong.length > 0 && (
          <span className="dr-ev-badge dr-ev-strong">{evidence.strong.length} Strong</span>
        )}
        {evidence.weak.length > 0 && (
          <span className="dr-ev-badge dr-ev-weak">{evidence.weak.length} Weak</span>
        )}
        {evidence.wearable_supported.length > 0 && (
          <span className="dr-ev-badge dr-ev-wearable">{evidence.wearable_supported.length} Wearable</span>
        )}
        {evidence.conflicting.length > 0 && (
          <span className="dr-ev-badge dr-ev-conflict">{evidence.conflicting.length} Conflicting</span>
        )}
      </div>

      {/* Detail list */}
      <div className="dr-evidence-details">
        {details.map((d, i) => (
          <div key={i} className="dr-evidence-row">
            <span className="dr-ev-symptom">{d.symptom.replace(/_/g, " ")}</span>
            <span
              className="dr-ev-reliability"
              style={{ color: RELIABILITY_COLORS[d.reliability_label] || "var(--dr-text-dim)" }}
            >
              {d.reliability_label.replace(/_/g, " ")}
            </span>
            <span className="dr-ev-score">{Math.round(d.reliability * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import type { ReasoningMetadata } from "../api/clinicalInterview.service";

interface Props {
  metadata: ReasoningMetadata | null;
}

export default function ClinicalReasoningPreview({ metadata }: Props) {
  if (!metadata) return null;

  const riskColor =
    metadata.severity_risk_state === "critical"
      ? "var(--ci-red)"
      : metadata.severity_risk_state === "high"
      ? "var(--ci-amber)"
      : "var(--ci-teal)";

  return (
    <div className="ci-reasoning-preview">
      <h4 className="ci-reasoning-title">Clinical Reasoning</h4>

      {/* Risk badge */}
      <div className="ci-reasoning-row">
        <span className="ci-reasoning-label">Risk State</span>
        <span className="ci-reasoning-badge" style={{ background: riskColor }}>
          {metadata.severity_risk_state}
        </span>
      </div>

      {/* Confidence */}
      <div className="ci-reasoning-row">
        <span className="ci-reasoning-label">Confidence</span>
        <div className="ci-confidence-bar-wrap">
          <div
            className="ci-confidence-bar"
            style={{ width: `${Math.round(metadata.reasoning_confidence * 100)}%` }}
          />
        </div>
        <span className="ci-reasoning-value">{Math.round(metadata.reasoning_confidence * 100)}%</span>
      </div>

      {/* Evidence */}
      <div className="ci-reasoning-row">
        <span className="ci-reasoning-label">Evidence</span>
        <span className="ci-reasoning-value">{metadata.evidence_sufficiency}</span>
      </div>

      {/* Hypotheses */}
      {metadata.hypotheses_preview && metadata.hypotheses_preview.length > 0 && (
        <div className="ci-hypotheses">
          <span className="ci-reasoning-label">Possible Directions</span>
          {metadata.hypotheses_preview.map((h, i) => (
            <div key={i} className="ci-hypothesis-row">
              <span className="ci-hypothesis-name">{h.condition}</span>
              <div className="ci-hypothesis-bar-wrap">
                <div
                  className="ci-hypothesis-bar"
                  style={{ width: `${Math.round(h.confidence * 100)}%` }}
                />
              </div>
              <span className="ci-hypothesis-pct">{Math.round(h.confidence * 100)}%</span>
            </div>
          ))}
          <p className="ci-disclaimer">
            These are investigative directions, <strong>not diagnoses</strong>.
            Always consult a healthcare professional.
          </p>
        </div>
      )}
    </div>
  );
}

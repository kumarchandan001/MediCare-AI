import React from "react";
import type { Ambiguity } from "../api/differentialReasoning.service";

interface Props {
  ambiguity: Ambiguity | null;
}

const DIM_LABELS: Record<string, string> = {
  evidence_insufficiency: "Insufficient Evidence",
  conflicting_evidence: "Conflicting Evidence",
  unstable_progression: "Unstable Progression",
  missing_context: "Missing Context",
  low_wearable_confidence: "Low Wearable Confidence",
  symptom_overlap: "Symptom Overlap",
};

export default function ClinicalAmbiguityPanel({ ambiguity }: Props) {
  if (!ambiguity) return null;

  return (
    <div className={`dr-ambiguity-panel dr-ambiguity-${ambiguity.level}`}>
      <h3 className="dr-section-title">
        Uncertainty Assessment
        <span className={`dr-ambiguity-level dr-level-${ambiguity.level}`}>
          {ambiguity.level}
        </span>
      </h3>

      {/* Dimension bars */}
      <div className="dr-ambiguity-dims">
        {Object.entries(ambiguity.dimensions).map(([key, val]) => (
          <div key={key} className="dr-dim-row">
            <span className="dr-dim-label">{DIM_LABELS[key] || key}</span>
            <div className="dr-dim-bar-wrap">
              <div className="dr-dim-bar" style={{ width: `${Math.round(val * 100)}%` }} />
            </div>
            <span className="dr-dim-val">{Math.round(val * 100)}%</span>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {ambiguity.warnings.length > 0 && (
        <div className="dr-ambiguity-warnings">
          {ambiguity.warnings.map((w, i) => (
            <p key={i} className="dr-warning-text">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

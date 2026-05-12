import React from "react";
import type { Exclusion } from "../api/differentialReasoning.service";

interface Props {
  exclusions: Exclusion[];
}

export default function ExclusionReasoningPanel({ exclusions }: Props) {
  if (!exclusions.length) return null;

  return (
    <div className="dr-exclusion-panel">
      <h3 className="dr-section-title">Conditions Weakened</h3>
      {exclusions.map((ex, i) => (
        <div key={i} className="dr-exclusion-card">
          <div className="dr-excl-header">
            <span className="dr-excl-name">{ex.condition}</span>
            <span className="dr-excl-status">{ex.status}</span>
          </div>
          <ul className="dr-excl-reasons">
            {ex.reasons.map((r, j) => (
              <li key={j}>{r}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

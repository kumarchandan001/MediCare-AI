import React from "react";
import type { DeteriorationData } from "../temporal-clinical.service";

interface Props {
  deterioration: DeteriorationData | null;
}

export default function DeteriorationRiskPanel({ deterioration }: Props) {
  if (!deterioration) return null;

  const pct = Math.round(deterioration.score * 100);
  const barClass = pct > 40 ? "tc-det-bar-high" : pct > 15 ? "tc-det-bar-med" : "tc-det-bar-low";

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">
        Deterioration Risk
        {deterioration.is_deteriorating && (
          <span className="tc-badge tc-trend-worsening">{deterioration.type}</span>
        )}
      </h3>

      <div className="tc-det-bar-wrap">
        <div className={`tc-det-bar ${barClass}`} style={{ width: `${pct}%` }} />
      </div>

      {deterioration.domains.length > 0 && (
        <div className="tc-det-domains">
          {deterioration.domains.map((d) => (
            <span key={d} className="tc-det-domain">{d}</span>
          ))}
        </div>
      )}

      <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", marginTop: "8px", lineHeight: 1.5 }}>
        {deterioration.explanation}
      </p>
    </div>
  );
}

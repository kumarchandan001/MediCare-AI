import React from "react";
import type { GovernanceResult } from "../governance.service";

interface Props {
  governance: GovernanceResult | null;
}

export default function TrustTransparencyPanel({ governance }: Props) {
  if (!governance) return null;

  const adjustments = governance.confidence_adjustments || [];

  return (
    <div className="gov-panel">
      <h3 className="gov-title">Confidence Governance</h3>

      <div className={`gov-safety-status ${governance.is_safe ? "gov-safe" : "gov-unsafe"}`}>
        <span className={`gov-status-dot ${governance.is_safe ? "gov-status-dot-safe" : "gov-status-dot-unsafe"}`} />
        <span className="gov-status-text">
          {governance.is_safe ? "All safety checks passed" : "Safety adjustments applied"}
        </span>
      </div>

      {adjustments.length > 0 && (
        <div className="gov-adj-list">
          {adjustments.map((a, i) => (
            <div key={i} className="gov-adj">
              <strong>{a.condition}</strong>: {(a.raw * 100).toFixed(0)}% &rarr; {(a.governed * 100).toFixed(0)}%
              <div className="gov-adj-reason">{a.reasons[0]}</div>
            </div>
          ))}
        </div>
      )}

      <p className="gov-dim" style={{ marginTop: "8px" }}>{governance.summary}</p>
    </div>
  );
}

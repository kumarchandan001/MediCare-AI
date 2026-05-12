import React from "react";
import type { EscalationData } from "../temporal-clinical.service";

interface Props {
  escalation: EscalationData | null;
}

export default function EscalationPredictionPanel({ escalation }: Props) {
  if (!escalation || escalation.escalation_likelihood < 0.05) return null;

  const pct = Math.round(escalation.escalation_likelihood * 100);
  const color = pct > 50 ? "var(--tc-red)" : pct > 25 ? "var(--tc-amber)" : "var(--tc-teal)";

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">
        Escalation Tracking
        {escalation.cooldown_active && (
          <span className="tc-badge" style={{ background: "var(--tc-surface-hover)", color: "var(--tc-text-dim)" }}>
            Cooldown
          </span>
        )}
      </h3>

      <div className="tc-esc-meter">
        <div className="tc-esc-bar-wrap">
          <div className="tc-esc-bar" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="tc-esc-pct" style={{ color }}>{pct}%</span>
      </div>

      {escalation.cooldown_active && (
        <p className="tc-esc-cooldown">
          A recent alert was issued. Monitoring continues without repeated notifications.
        </p>
      )}

      <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", lineHeight: 1.5 }}>
        {escalation.explanation}
      </p>
    </div>
  );
}

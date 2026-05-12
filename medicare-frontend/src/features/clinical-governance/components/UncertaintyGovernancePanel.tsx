import React from "react";
import type { GovernanceResult } from "../governance.service";

interface Props {
  governance: GovernanceResult | null;
}

export default function UncertaintyGovernancePanel({ governance }: Props) {
  if (!governance) return null;

  const u = governance.uncertainty;

  return (
    <div className="gov-panel">
      <h3 className="gov-title">
        Uncertainty Governance
        <span className="gov-badge" style={{
          background: u.is_safe ? "var(--gov-teal-dim)" : "var(--gov-red-dim)",
          color: u.is_safe ? "var(--gov-teal)" : "var(--gov-red)",
        }}>
          {u.is_safe ? "Safe" : "Issues"}
        </span>
      </h3>

      {u.violations.length > 0 && (
        <div className="gov-adj-list">
          {u.violations.map((v: any, i: number) => (
            <div key={i} className="gov-adj">
              <span style={{ color: "var(--gov-red)" }}>{v.type.replace(/_/g, " ")}</span>: {v.action}
            </div>
          ))}
        </div>
      )}

      {u.warnings.length > 0 && (
        <div className="gov-adj-list" style={{ marginTop: "6px" }}>
          {u.warnings.map((w: any, i: number) => (
            <div key={i} className="gov-adj">
              <span style={{ color: "var(--gov-amber)" }}>{w.type.replace(/_/g, " ")}</span>: {w.action}
            </div>
          ))}
        </div>
      )}

      <p className="gov-dim" style={{ marginTop: "8px" }}>{u.is_safe ? "All probabilistic safety checks passed." : "Uncertainty governance detected issues and applied corrections."}</p>
    </div>
  );
}

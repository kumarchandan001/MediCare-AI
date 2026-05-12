import React from "react";
import type { GovernanceResult } from "../governance.service";

interface Props {
  governance: GovernanceResult | null;
}

export default function InvestigationSafetyPanel({ governance }: Props) {
  if (!governance) return null;

  const { safety, ethics, ambiguity } = governance;

  const items = [
    { label: "Medical Safety", ok: safety.is_safe, detail: safety.is_safe ? "Passed" : `${safety.violations.length} issue(s) remediated` },
    { label: "Ethical Bounds", ok: ethics.is_ethical, detail: ethics.is_ethical ? "Within bounds" : `${ethics.violations.length} concern(s)` },
    { label: "Ambiguity", ok: true, detail: `${ambiguity.ambiguity_level} (${(ambiguity.ambiguity_score * 100).toFixed(0)}%)` },
  ];

  return (
    <div className="gov-panel">
      <h3 className="gov-title">Investigation Safety</h3>
      <div className="gov-completeness-grid">
        {items.map((item, i) => (
          <div key={i} className="gov-comp-item">
            <div className="gov-comp-value" style={{ color: item.ok ? "var(--gov-teal)" : "var(--gov-red)" }}>
              {item.ok ? "\u2713" : "\u26A0"}
            </div>
            <div className="gov-comp-label">{item.label}</div>
            <div className="gov-dim">{item.detail}</div>
          </div>
        ))}
      </div>
      {safety.disclaimer && (
        <div className="gov-disclaimer"><p>{safety.disclaimer}</p></div>
      )}
    </div>
  );
}

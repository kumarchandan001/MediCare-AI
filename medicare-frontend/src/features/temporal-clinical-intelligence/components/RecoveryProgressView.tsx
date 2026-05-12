import React from "react";
import type { RecoveryData } from "../temporal-clinical.service";

interface Props {
  recovery: RecoveryData | null;
}

export default function RecoveryProgressView({ recovery }: Props) {
  if (!recovery || !recovery.is_recovering) return null;

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">Recovery Progress</h3>

      <div className="tc-recovery-metrics">
        <div className="tc-recovery-metric">
          <div className="tc-recovery-metric-value">{Math.round(recovery.recovery_quality * 100)}%</div>
          <div className="tc-recovery-metric-label">Quality</div>
        </div>
        <div className="tc-recovery-metric">
          <div className="tc-recovery-metric-value" style={{ color: recovery.fragility > 0.5 ? "var(--tc-amber)" : "var(--tc-teal)" }}>
            {Math.round(recovery.fragility * 100)}%
          </div>
          <div className="tc-recovery-metric-label">Fragility</div>
        </div>
        <div className="tc-recovery-metric">
          <div className="tc-recovery-metric-value" style={{ color: recovery.consistency > 0.6 ? "var(--tc-teal)" : "var(--tc-amber)" }}>
            {Math.round(recovery.consistency * 100)}%
          </div>
          <div className="tc-recovery-metric-label">Consistency</div>
        </div>
        <div className="tc-recovery-metric">
          <div className="tc-recovery-metric-value" style={{ color: recovery.relapse_probability > 0.3 ? "var(--tc-red)" : "var(--tc-teal)" }}>
            {Math.round(recovery.relapse_probability * 100)}%
          </div>
          <div className="tc-recovery-metric-label">Relapse Risk</div>
        </div>
      </div>

      {recovery.milestones.length > 0 && (
        <div className="tc-recovery-milestones">
          {recovery.milestones.map((m, i) => (
            <span key={i} className={`tc-milestone ${m.reached ? "" : "tc-milestone-pending"}`}>
              {m.label}
            </span>
          ))}
        </div>
      )}

      <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", marginTop: "8px", lineHeight: 1.5 }}>
        {recovery.explanation}
      </p>
    </div>
  );
}

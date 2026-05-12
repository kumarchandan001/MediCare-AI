import React from "react";
import type { TrajectoryData, DeteriorationData, RecoveryData, EscalationData } from "../temporal-clinical.service";

interface Props {
  trajectory: TrajectoryData | null;
  deterioration: DeteriorationData | null;
  recovery: RecoveryData | null;
  escalation: EscalationData | null;
}

export default function ClinicalTrendExplorer({ trajectory, deterioration, recovery, escalation }: Props) {
  const cards = [];

  if (trajectory) {
    cards.push({
      label: "Trajectory",
      value: trajectory.trajectory,
      sub: `Stability: ${Math.round(trajectory.stability_score * 100)}%`,
      color: trajectory.trajectory === "improving" ? "var(--tc-teal)" :
        trajectory.trajectory === "deteriorating" ? "var(--tc-red)" : "var(--tc-text-dim)",
    });
  }

  if (deterioration) {
    cards.push({
      label: "Deterioration",
      value: deterioration.is_deteriorating ? deterioration.type : "None",
      sub: `Score: ${Math.round(deterioration.score * 100)}%`,
      color: deterioration.is_deteriorating ? "var(--tc-red)" : "var(--tc-teal)",
    });
  }

  if (recovery?.is_recovering) {
    cards.push({
      label: "Recovery",
      value: `${Math.round(recovery.recovery_quality * 100)}%`,
      sub: recovery.fragility > 0.5 ? "Fragile" : "Sustained",
      color: recovery.fragility > 0.5 ? "var(--tc-amber)" : "var(--tc-teal)",
    });
  }

  if (escalation && escalation.escalation_likelihood > 0.05) {
    cards.push({
      label: "Escalation Risk",
      value: `${Math.round(escalation.escalation_likelihood * 100)}%`,
      sub: escalation.trajectory,
      color: escalation.escalation_likelihood > 0.4 ? "var(--tc-red)" : "var(--tc-amber)",
    });
  }

  if (!cards.length) return null;

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">Clinical Trends</h3>
      <div className="tc-trend-cards">
        {cards.map((c, i) => (
          <div key={i} className="tc-trend-card">
            <div className="tc-trend-card-label">{c.label}</div>
            <div className="tc-trend-card-value" style={{ color: c.color }}>{c.value}</div>
            <div className="tc-trend-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

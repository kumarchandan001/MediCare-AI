import React from "react";
import type { SeverityData, TriageData } from "../temporal-clinical.service";

interface Props {
  severity: SeverityData | null;
  triage: TriageData | null;
}

export default function SeverityStateMonitor({ severity, triage }: Props) {
  if (!severity) return null;

  const pct = Math.round(severity.severity_score * 100);

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">Clinical Severity</h3>

      <div className="tc-severity-monitor">
        <div className={`tc-severity-ring tc-sev-${severity.severity_level}`}>
          {pct}%
        </div>
        <div className="tc-severity-info">
          <div className="tc-severity-level">{severity.severity_level}</div>
          <div className="tc-severity-explanation">{severity.explanation}</div>
        </div>
      </div>

      {triage && (
        <div style={{ marginTop: "8px" }}>
          <span className={`tc-triage-badge tc-triage-${triage.triage_level}`}>
            {triage.triage_level.replace(/_/g, " ")}
          </span>
          <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", marginTop: "6px", lineHeight: 1.5 }}>
            {triage.action}
          </p>
        </div>
      )}
    </div>
  );
}

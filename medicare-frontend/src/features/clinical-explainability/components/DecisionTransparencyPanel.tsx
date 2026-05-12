import React from "react";
import type { DecisionData } from "../explainability.service";

interface Props {
  decisions: DecisionData | null;
}

export default function DecisionTransparencyPanel({ decisions }: Props) {
  if (!decisions || decisions.decisions.length === 0) return null;

  return (
    <div className="ex-panel">
      <h3 className="ex-title">Decision Transparency</h3>
      <p className="ex-dim" style={{ marginBottom: "8px" }}>{decisions.summary}</p>

      <div className="ex-decisions">
        {decisions.decisions.slice(0, 5).map((d, i) => (
          <div key={i} className="ex-decision">
            <div className="ex-decision-action">
              {d.action}
              <span className={`ex-decision-prio ex-prio-${d.priority}`}>{d.priority}</span>
            </div>
            <div className="ex-decision-text">{d.explanation}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

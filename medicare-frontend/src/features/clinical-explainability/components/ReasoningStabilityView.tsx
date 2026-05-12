import React from "react";
import type { ReasoningStabilityData } from "../explainability.service";

interface Props {
  stability: ReasoningStabilityData | null;
}

export default function ReasoningStabilityView({ stability }: Props) {
  if (!stability) return null;

  const pct = Math.round(stability.stability_score * 100);

  return (
    <div className="ex-panel" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div className={`ex-stability-ring ex-stab-${stability.state}`}>{pct}%</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ex-text)", textTransform: "capitalize" }}>
          {stability.state.replace(/_/g, " ")}
        </div>
        <p className="ex-dim" style={{ marginTop: "2px" }}>{stability.explanation}</p>
      </div>
    </div>
  );
}

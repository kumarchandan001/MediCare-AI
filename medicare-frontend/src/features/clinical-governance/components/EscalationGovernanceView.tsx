import React from "react";
import type { EscalationData } from "../governance.service";

interface Props {
  escalation: EscalationData | null;
}

export default function EscalationGovernanceView({ escalation }: Props) {
  if (!escalation) return null;

  return (
    <div className={`gov-escalation-banner gov-esc-${escalation.escalation_level}`}>
      <div className="gov-esc-level">
        {escalation.is_emergency ? "\u26A0 " : ""}
        {escalation.escalation_level}
      </div>
      <div className="gov-esc-action">{escalation.action}</div>
      {escalation.is_emergency && escalation.emergency_symptoms && (
        <div className="gov-dim" style={{ marginTop: "6px" }}>
          Detected: {escalation.emergency_symptoms.map((s) => s.replace(/_/g, " ")).join(", ")}
        </div>
      )}
      {escalation.reasons && escalation.reasons.length > 0 && !escalation.is_emergency && (
        <div className="gov-dim" style={{ marginTop: "4px" }}>
          {escalation.reasons[0]}
        </div>
      )}
    </div>
  );
}

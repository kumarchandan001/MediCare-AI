import React from "react";

interface Props {
  isEscalated: boolean;
  reason: string;
  action: string;
  onAcknowledge: () => void;
}

export default function SeverityAlertPanel({ isEscalated, reason, action, onAcknowledge }: Props) {
  if (!isEscalated) return null;

  return (
    <div className="ci-severity-overlay">
      <div className="ci-severity-card">
        <div className="ci-severity-icon-wrap">
          <span className="ci-severity-icon">🚨</span>
        </div>
        <h2 className="ci-severity-title">Urgent Safety Alert</h2>
        <p className="ci-severity-reason">{reason}</p>
        <p className="ci-severity-action">{action}</p>
        <div className="ci-severity-disclaimer">
          <p>
            This is <strong>not a diagnosis</strong>. The system has detected a pattern
            that may require immediate medical attention. Please contact a healthcare
            professional or emergency services if you feel unwell.
          </p>
        </div>
        <button className="ci-severity-ack-btn" onClick={onAcknowledge}>
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}

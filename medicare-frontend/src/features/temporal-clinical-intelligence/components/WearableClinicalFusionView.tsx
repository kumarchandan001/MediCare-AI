import React from "react";
import type { WearableTrustData } from "../temporal-clinical.service";

interface Props {
  trust: WearableTrustData | null;
  latestReadings?: Record<string, any>;
}

const METRIC_LABELS: Record<string, string> = {
  spo2: "SpO2",
  heart_rate: "Heart Rate",
  temperature: "Temp",
  hrv: "HRV",
  sleep_quality: "Sleep",
  respiration_rate: "Resp Rate",
};

const METRIC_UNITS: Record<string, string> = {
  spo2: "%",
  heart_rate: "bpm",
  temperature: "°C",
  hrv: "ms",
  respiration_rate: "/min",
};

export default function WearableClinicalFusionView({ trust, latestReadings }: Props) {
  const readings = latestReadings || {};
  const metrics = Object.keys(readings).filter((k) => k in METRIC_LABELS);

  const trustClass = !trust ? "tc-trust-low"
    : trust.trust_score > 0.7 ? "tc-trust-high"
    : trust.trust_score > 0.4 ? "tc-trust-med" : "tc-trust-low";

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">Wearable Integration</h3>

      {metrics.length > 0 && (
        <div className="tc-wearable-grid">
          {metrics.map((k) => (
            <div key={k} className="tc-wearable-card">
              <div className="tc-wearable-value">
                {typeof readings[k] === "number" ? readings[k].toFixed(k === "temperature" ? 1 : 0) : readings[k]}
                <span style={{ fontSize: ".65rem", fontWeight: 400, marginLeft: 2 }}>
                  {METRIC_UNITS[k] || ""}
                </span>
              </div>
              <div className="tc-wearable-label">{METRIC_LABELS[k]}</div>
            </div>
          ))}
        </div>
      )}

      {trust && (
        <div className="tc-wearable-trust">
          <span className={`tc-trust-dot ${trustClass}`} />
          <span>
            Trust: {Math.round(trust.trust_score * 100)}%
            {trust.anomalies_detected > 0 && ` · ${trust.anomalies_detected} anomalies filtered`}
          </span>
        </div>
      )}

      {trust && (
        <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", marginTop: "6px", lineHeight: 1.5 }}>
          {trust.explanation}
        </p>
      )}
    </div>
  );
}

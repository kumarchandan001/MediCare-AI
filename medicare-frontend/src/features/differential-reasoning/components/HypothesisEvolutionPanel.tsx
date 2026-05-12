import React from "react";
import type { Hypothesis, Stability } from "../api/differentialReasoning.service";

interface Props {
  hypotheses: Hypothesis[];
  stability: Stability | null;
}

export default function HypothesisEvolutionPanel({ hypotheses, stability }: Props) {
  if (!hypotheses.length) return null;

  return (
    <div className="dr-hypothesis-panel">
      <h3 className="dr-section-title">
        Clinical Hypotheses
        {stability?.overall_stability === "unstable" && (
          <span className="dr-volatile-badge">Evolving</span>
        )}
      </h3>
      <p className="dr-disclaimer-inline">
        Investigative directions — <strong>not diagnoses</strong>
      </p>
      <div className="dr-hypothesis-list">
        {hypotheses.slice(0, 6).map((h, i) => {
          const stabilityInfo = stability?.conditions?.[h.condition];
          const pct = Math.round(h.confidence * 100);
          return (
            <div key={h.condition} className="dr-hypothesis-card">
              <div className="dr-hyp-header">
                <span className="dr-hyp-rank">#{i + 1}</span>
                <span className="dr-hyp-name">{h.condition}</span>
                {stabilityInfo?.is_volatile && (
                  <span className="dr-hyp-volatile" title="Confidence is shifting rapidly">⚡</span>
                )}
                {h.severity_priority >= 2.0 && (
                  <span className="dr-hyp-severity" title="High severity priority">🔴</span>
                )}
              </div>
              <div className="dr-hyp-bar-wrap">
                <div
                  className="dr-hyp-bar"
                  style={{ width: `${pct}%` }}
                  data-trend={h.trend}
                />
              </div>
              <div className="dr-hyp-meta">
                <span className="dr-hyp-pct">{pct}%</span>
                {stabilityInfo && (
                  <span className={`dr-hyp-stability dr-stability-${stabilityInfo.label}`}>
                    {stabilityInfo.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

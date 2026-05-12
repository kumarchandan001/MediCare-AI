import React from "react";
import type { Comparison } from "../api/differentialReasoning.service";

interface Props {
  comparisons: Comparison[];
}

export default function DifferentialComparisonCards({ comparisons }: Props) {
  if (!comparisons.length) return null;

  return (
    <div className="dr-comparison-panel">
      <h3 className="dr-section-title">Competing Conditions</h3>
      {comparisons.map((c, i) => (
        <div key={i} className={`dr-comparison-card dr-verdict-${c.verdict}`}>
          <div className="dr-comp-header">
            <div className="dr-comp-side">
              <span className="dr-comp-name">{c.condition_a}</span>
              <span className="dr-comp-pct">{Math.round(c.confidence_a * 100)}%</span>
            </div>
            <span className="dr-comp-vs">vs</span>
            <div className="dr-comp-side">
              <span className="dr-comp-name">{c.condition_b}</span>
              <span className="dr-comp-pct">{Math.round(c.confidence_b * 100)}%</span>
            </div>
          </div>
          <div className="dr-comp-distinctions">
            <p className="dr-comp-dist">{c.distinction_a}</p>
            <p className="dr-comp-dist">{c.distinction_b}</p>
          </div>
          {c.verdict === "closely_competing" && (
            <p className="dr-comp-note">These conditions are closely competing — more evidence is needed.</p>
          )}
        </div>
      ))}
    </div>
  );
}

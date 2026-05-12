import React from "react";

interface Props {
  overlaps: {
    coexisting_conditions: { primary: string; secondary: string; explanation: string }[];
    multi_condition_possible: boolean;
  } | null;
}

export default function MultiConditionReasoningView({ overlaps }: Props) {
  if (!overlaps || !overlaps.multi_condition_possible) return null;

  return (
    <div className="dr-multi-panel">
      <h3 className="dr-section-title">Multi-Condition Reasoning</h3>
      <p className="dr-multi-note">Multiple conditions may coexist — this is being tracked.</p>
      {overlaps.coexisting_conditions.map((c, i) => (
        <div key={i} className="dr-coexist-card">
          <div className="dr-coexist-pair">
            <span className="dr-coexist-primary">{c.primary}</span>
            <span className="dr-coexist-plus">+</span>
            <span className="dr-coexist-secondary">{c.secondary}</span>
          </div>
          <p className="dr-coexist-explanation">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}

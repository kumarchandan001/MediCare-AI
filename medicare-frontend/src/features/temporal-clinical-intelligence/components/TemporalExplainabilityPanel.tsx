import React from "react";
import type { LongitudinalSnapshot } from "../temporal-clinical.service";

interface Props {
  snapshot: LongitudinalSnapshot | null;
}

const EXPLAIN_KEYS: { key: string; label: string }[] = [
  { key: "trajectory", label: "Trajectory" },
  { key: "deterioration", label: "Deterioration" },
  { key: "recovery", label: "Recovery" },
  { key: "escalation", label: "Escalation" },
  { key: "symptom_evolution", label: "Symptom Changes" },
];

export default function TemporalExplainabilityPanel({ snapshot }: Props) {
  if (!snapshot) return null;

  const explanations = EXPLAIN_KEYS
    .map(({ key, label }) => {
      const section = (snapshot as any)[key];
      return section?.explanation ? { label, text: section.explanation } : null;
    })
    .filter(Boolean) as { label: string; text: string }[];

  if (!explanations.length) return null;

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">Why These Changes?</h3>
      {explanations.map((e, i) => (
        <div key={i} className="tc-explain-row">
          <span className="tc-explain-label">{e.label}:</span>
          {e.text}
        </div>
      ))}

      <div className="tc-safety-footer" style={{ marginTop: "12px" }}>
        <p>
          These explanations reflect probabilistic clinical reasoning — <strong>not diagnoses</strong>.
          Always consult a healthcare professional for medical decisions.
        </p>
      </div>
    </div>
  );
}

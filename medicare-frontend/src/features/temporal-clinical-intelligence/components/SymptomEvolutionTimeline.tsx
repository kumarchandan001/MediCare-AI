import React from "react";
import type { SymptomEvolutionData } from "../temporal-clinical.service";

interface Props {
  evolution: SymptomEvolutionData | null;
}

export default function SymptomEvolutionTimeline({ evolution }: Props) {
  if (!evolution) return null;

  const { changes, new_symptoms, resolved_symptoms, persistent, spreading, explanation } = evolution;

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">
        Symptom Evolution
        {spreading && <span className="tc-badge tc-trend-worsening">Spreading</span>}
      </h3>

      <div className="tc-evolution-timeline">
        {/* New symptoms */}
        {new_symptoms.map((s) => (
          <div key={`new-${s}`} className="tc-evo-row">
            <span className="tc-evo-dot tc-evo-dot-new" />
            <span className="tc-evo-name">{s.replace(/_/g, " ")}</span>
            <span className="tc-evo-trend tc-trend-worsening">New</span>
          </div>
        ))}

        {/* Persistent with trend */}
        {changes
          .filter((c) => persistent.includes(c.symptom))
          .map((c) => (
            <div key={`change-${c.symptom}`} className="tc-evo-row">
              <span className={`tc-evo-dot tc-evo-dot-${c.trend}`} />
              <span className="tc-evo-name">{c.symptom.replace(/_/g, " ")}</span>
              <span className={`tc-evo-trend tc-trend-${c.trend}`}>{c.trend}</span>
            </div>
          ))}

        {/* Resolved */}
        {resolved_symptoms.map((s) => (
          <div key={`resolved-${s}`} className="tc-evo-row">
            <span className="tc-evo-dot tc-evo-dot-resolved" />
            <span className="tc-evo-name" style={{ textDecoration: "line-through" }}>
              {s.replace(/_/g, " ")}
            </span>
            <span className="tc-evo-trend tc-trend-improving">Resolved</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: ".72rem", color: "var(--tc-text-dim)", marginTop: "8px", lineHeight: 1.5 }}>
        {explanation}
      </p>
    </div>
  );
}

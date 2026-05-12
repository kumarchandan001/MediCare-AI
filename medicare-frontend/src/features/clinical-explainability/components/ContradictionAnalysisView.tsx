import React from "react";
import type { ContradictionData } from "../explainability.service";

interface Props {
  data: ContradictionData | null;
}

export default function ContradictionAnalysisView({ data }: Props) {
  if (!data || data.contradiction_count === 0) return null;

  return (
    <div className="ex-panel">
      <h3 className="ex-title">
        Investigation Refinements
        <span className="ex-badge" style={{ background: "var(--ex-amber-dim)", color: "var(--ex-amber)" }}>
          {data.contradiction_count}
        </span>
      </h3>

      <div className="ex-contra-list">
        {data.contradictions.slice(0, 4).map((c, i) => (
          <div key={i} className="ex-contra-item">
            <div className="ex-contra-label">{c.label}</div>
            <div className="ex-contra-text">{c.explanation}</div>
          </div>
        ))}
      </div>

      {data.story?.narrative && (
        <div className="ex-contra-story">{data.story.narrative}</div>
      )}

      {data.resolution_suggestions.length > 0 && (
        <p className="ex-dim" style={{ marginTop: "8px" }}>
          Suggestion: {data.resolution_suggestions[0]}
        </p>
      )}
    </div>
  );
}

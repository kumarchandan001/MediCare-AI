import React from "react";
import type { EvidenceLandscapeData } from "../explainability.service";

interface Props {
  landscape: EvidenceLandscapeData | null;
}

export default function EvidenceTransparencyPanel({ landscape }: Props) {
  const [showAll, setShowAll] = React.useState(false);

  if (!landscape) return null;

  const all = [
    ...landscape.strong_evidence.map((e) => ({ ...e, category: "strong" as const })),
    ...landscape.conflicting_evidence.map((e) => ({ ...e, category: "conflicting" as const })),
    ...landscape.weak_evidence.map((e) => ({ ...e, category: "weak" as const })),
    ...landscape.missing_evidence.map((e) => ({ ...e, category: "missing" as const })),
  ];

  const visible = showAll ? all : all.slice(0, 4);
  const sufPct = Math.round(landscape.sufficiency_score * 100);
  const sufColor = sufPct > 70 ? "var(--ex-teal)" : sufPct > 40 ? "var(--ex-amber)" : "var(--ex-red)";

  return (
    <div className="ex-panel">
      <h3 className="ex-title">Evidence Transparency</h3>

      <div className="ex-suf-bar-wrap">
        <div className="ex-suf-bar" style={{ width: `${sufPct}%`, background: sufColor }} />
      </div>
      <p className="ex-dim" style={{ marginBottom: "8px" }}>
        Evidence sufficiency: {sufPct}% &mdash; {landscape.summary}
      </p>

      <div className="ex-evidence-grid">
        {visible.map((ev, i) => (
          <div key={i} className="ex-ev-row">
            <span className={`ex-ev-dot ex-ev-dot-${ev.category}`} />
            <span className="ex-ev-text">{ev.explanation}</span>
            <span className={`ex-ev-tag ex-ev-tag-${ev.category}`}>{ev.category}</span>
          </div>
        ))}
      </div>

      {all.length > 4 && (
        <button className="ex-expand-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show less" : `Show all ${all.length} evidence items`}
        </button>
      )}
    </div>
  );
}

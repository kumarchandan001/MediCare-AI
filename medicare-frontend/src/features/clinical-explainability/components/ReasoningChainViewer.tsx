import React from "react";
import type { ReasoningChainData } from "../explainability.service";

interface Props {
  chain: ReasoningChainData | null;
}

export default function ReasoningChainViewer({ chain }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  if (!chain) return null;

  return (
    <div className="ex-panel">
      <h3 className="ex-title">
        Reasoning Chain
        <span className="ex-badge" style={{ background: "var(--ex-surface-hover)", color: "var(--ex-text-dim)" }}>
          {chain.detail_level}
        </span>
      </h3>

      {/* Summary always visible (Progressive Cognitive Disclosure) */}
      <p className="ex-dim">{chain.summary}</p>

      <button className="ex-expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide reasoning steps" : "Show reasoning steps"}
      </button>

      {expanded && (
        <div className="ex-chain" style={{ marginTop: "10px" }}>
          {chain.steps.map((step, i) => (
            <div key={i} className={`ex-step ex-step-${step.type}`}>
              <div className="ex-step-title">{step.title}</div>
              {step.items.map((item, j) => (
                <div key={j} className="ex-step-item">{item.text}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

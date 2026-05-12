import React from "react";
import type { EmotionalSafetyResult } from "../governance.service";

interface Props {
  emotionalSafety: EmotionalSafetyResult | null;
}

export default function EmotionalSafetyLayer({ emotionalSafety }: Props) {
  if (!emotionalSafety) return null;

  const pct = Math.round(emotionalSafety.emotional_safety_score * 100);
  const color = pct > 80 ? "var(--gov-teal)" : pct > 60 ? "var(--gov-amber)" : "var(--gov-red)";

  return (
    <div className="gov-emotional" style={{ borderLeftColor: color }}>
      <div className="gov-emotional-score">
        Emotional Safety: <span style={{ color }}>{pct}%</span>
      </div>
      <div className="gov-trust-meter">
        <div className="gov-trust-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="gov-dim">{emotionalSafety.summary}</p>
    </div>
  );
}

import React from "react";
import type { EvolutionEntry } from "../api/differentialReasoning.service";

interface Props {
  evolution: Record<string, EvolutionEntry> | null;
}

const TREND_ICONS: Record<string, string> = {
  increasing: "↑",
  decreasing: "↓",
  stable: "→",
  new: "•",
};

export default function ConfidenceEvolutionGraph({ evolution }: Props) {
  if (!evolution || Object.keys(evolution).length === 0) return null;

  return (
    <div className="dr-evolution-panel">
      <h3 className="dr-section-title">Confidence Evolution</h3>
      <div className="dr-evolution-list">
        {Object.entries(evolution).map(([cond, data]) => {
          const history = data.history;
          const maxVal = Math.max(...history, 0.01);
          return (
            <div key={cond} className="dr-evo-row">
              <div className="dr-evo-header">
                <span className="dr-evo-name">{cond}</span>
                <span className={`dr-evo-trend dr-trend-${data.trend}`}>
                  {TREND_ICONS[data.trend] || ""} {data.trend}
                </span>
              </div>
              {/* Mini sparkline */}
              <div className="dr-sparkline">
                {history.map((val, i) => (
                  <div
                    key={i}
                    className="dr-spark-bar"
                    style={{ height: `${(val / maxVal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="dr-evo-meta">
                <span>{Math.round(data.current * 100)}%</span>
                <span className={`dr-evo-delta ${data.delta > 0 ? "dr-delta-up" : data.delta < 0 ? "dr-delta-down" : ""}`}>
                  {data.delta > 0 ? "+" : ""}{Math.round(data.delta * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

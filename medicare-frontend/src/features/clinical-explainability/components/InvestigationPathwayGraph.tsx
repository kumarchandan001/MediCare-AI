import React from "react";
import type { InvestigationGraphData } from "../explainability.service";

interface Props {
  graph: InvestigationGraphData | null;
}

export default function InvestigationPathwayGraph({ graph }: Props) {
  const [showEdges, setShowEdges] = React.useState(false);

  if (!graph || graph.nodes.length === 0) return null;

  return (
    <div className="ex-panel">
      <h3 className="ex-title">Investigation Map</h3>

      <div className="ex-graph-nodes">
        {graph.nodes.map((n) => (
          <span
            key={n.id}
            className={`ex-graph-node ex-graph-node-${n.type}`}
            style={n.id === graph.focus_node ? { borderWidth: 2, fontWeight: 600 } : {}}
          >
            {n.label}
          </span>
        ))}
      </div>

      <button className="ex-expand-btn" onClick={() => setShowEdges(!showEdges)}>
        {showEdges ? "Hide relationships" : `Show ${graph.edges.length} relationships`}
      </button>

      {showEdges && (
        <div className="ex-graph-edges">
          {graph.edges.slice(0, 10).map((e, i) => {
            const fromNode = graph.nodes.find((n) => n.id === e.from);
            const toNode = graph.nodes.find((n) => n.id === e.to);
            return (
              <div key={i} className="ex-graph-edge">
                {fromNode?.label || e.from} <span style={{ color: e.type === "supports" ? "var(--ex-teal)" : "var(--ex-red)" }}>{e.label}</span> {toNode?.label || e.to}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

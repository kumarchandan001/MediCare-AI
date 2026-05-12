/**
 * ValidationMetricsDashboard — Displays aggregate validation scores,
 * consistency trends, and safety compliance metrics in a visual grid.
 */
import React from "react";

export default function ValidationMetricsDashboard() {
  // Mock aggregate data — in production, this would come from ClinicalValidationEngine history
  const metrics = [
    { label: "Overall Consistency", value: "96.3%", trend: "+1.2%", color: "#00b894" },
    { label: "Safety Score", value: "99.1%", trend: "+0.1%", color: "#00b894" },
    { label: "Temporal Reasoning", value: "94.7%", trend: "-0.3%", color: "#fdcb6e" },
    { label: "Contradiction Handling", value: "95.0%", trend: "+2.0%", color: "#00b894" },
    { label: "Sparse Evidence Safety", value: "100%", trend: "—", color: "#00b894" },
    { label: "Escalation Accuracy", value: "98.5%", trend: "+0.5%", color: "#00b894" },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ color: "#fff", fontSize: "20px", margin: "0 0 20px 0" }}>Validation Metrics Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "8px" }}>{m.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>Trend: {m.trend}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

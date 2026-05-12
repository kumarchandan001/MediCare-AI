/**
 * InvestigationReviewPanel — UI for reviewing the AI's longitudinal disease
 * investigations, specifically highlighting stability and drift metrics.
 */
import React from "react";
import ReasoningInspectionLayer from "./ReasoningInspectionLayer";

export default function InvestigationReviewPanel() {
  // Mock data for UI layout
  const mockInvestigations = [
    { id: "INV-882", patient: "Anon-X", stability: "refining", driftScore: 25, duration: "14 days" },
    { id: "INV-883", patient: "Anon-Y", stability: "stable", driftScore: 5, duration: "45 days" },
    { id: "INV-884", patient: "Anon-Z", stability: "thrashing", driftScore: 80, duration: "3 days" }
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "100%" }}>
      <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", padding: "20px" }}>
        <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginTop: 0 }}>Active Investigations</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mockInvestigations.map(inv => (
            <div key={inv.id} style={{ 
              padding: "12px", 
              background: "rgba(255,255,255,0.03)", 
              borderRadius: "8px",
              cursor: "pointer",
              borderLeft: `3px solid ${inv.stability === "stable" ? "#00b894" : inv.stability === "refining" ? "#fdcb6e" : "#ff7675"}`
            }}>
              <div style={{ fontWeight: 600, color: "#fff" }}>{inv.id}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Drift Score: {inv.driftScore}/100</div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ padding: "20px" }}>
        <ReasoningInspectionLayer investigationId="INV-882" />
      </div>
    </div>
  );
}

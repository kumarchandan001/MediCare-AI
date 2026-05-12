/**
 * ReasoningInspectionLayer — A deep-dive view into exactly WHY the AI made a
 * specific diagnostic hypothesis, showing the evidence, timelines, and confidence scores.
 */
import React from "react";

export default function ReasoningInspectionLayer({ investigationId }: { investigationId: string }) {
  // In a real app, fetch investigation details using the ID
  
  return (
    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "24px" }}>
      <h2 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "22px" }}>Inspection: {investigationId}</h2>
      <div style={{ color: "#00b894", fontSize: "14px", fontWeight: 600, marginBottom: "24px" }}>Status: Stable Hypothesis</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Evidence Chain */}
        <div>
          <h4 style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontSize: "12px", marginBottom: "12px" }}>Evidence Chain</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#fff", fontSize: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <li style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>
              <strong style={{ color: "#74b9ff" }}>Day 1:</strong> Patient reported mild fatigue.
            </li>
            <li style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>
              <strong style={{ color: "#74b9ff" }}>Day 3:</strong> Wearable detected 15% drop in HRV.
            </li>
            <li style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", borderLeft: "3px solid #00b894" }}>
              <strong style={{ color: "#00b894" }}>Day 5 (Current):</strong> Pattern matched to Subclinical Viral Infection.
            </li>
          </ul>
        </div>

        {/* Counter-Factuals / Discarded */}
        <div>
          <h4 style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontSize: "12px", marginBottom: "12px" }}>Discarded Hypotheses</h4>
          <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "#ff7675", fontWeight: 600, marginBottom: "8px" }}>Burnout / Overtraining</div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: 0 }}>
              Discarded because sleep architecture remained stable despite HRV drop. Physical strain metrics did not correlate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

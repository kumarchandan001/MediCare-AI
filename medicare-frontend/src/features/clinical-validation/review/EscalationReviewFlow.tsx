/**
 * EscalationReviewFlow — UI for reviewing critical escalations triggered by the AI.
 * Medical professionals use this to verify if an escalation was a true positive,
 * false positive, or missed context.
 */
import React from "react";

export default function EscalationReviewFlow() {
  const mockEscalations = [
    { id: "ESC-001", trigger: "Wearable Tachycardia + Chest Pain", time: "10 mins ago", status: "pending" },
    { id: "ESC-002", trigger: "Severe Lethargy + Hypotension", time: "2 hours ago", status: "reviewed_valid" }
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "20px" }}>Escalation Audit Queue</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {mockEscalations.map(esc => (
          <div key={esc.id} style={{ 
            padding: "16px", 
            background: "rgba(255,255,255,0.05)", 
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderLeft: esc.status === "pending" ? "4px solid #ff7675" : "4px solid #00b894"
          }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: "16px" }}>{esc.trigger}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "4px" }}>{esc.id} • {esc.time}</div>
            </div>
            
            {esc.status === "pending" ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#00b894", color: "#fff", cursor: "pointer" }}>Verify Valid</button>
                <button style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", cursor: "pointer" }}>Flag False Positive</button>
              </div>
            ) : (
              <span style={{ color: "#00b894", fontSize: "14px", fontWeight: 600 }}>✓ Reviewed & Validated</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EscalationAnalysisCenter — Provides detailed analytics on all AI-triggered
 * escalations: true positive rates, false alarm rates, response time distributions,
 * and the emotional impact of escalation tone.
 */
import React from "react";

export default function EscalationAnalysisCenter() {
  const escalationStats = {
    totalEscalations: 47,
    truePositiveRate: 93.6,
    falseAlarmRate: 6.4,
    avgResponseTimeSec: 12,
    panicInducedRate: 4.2,
  };

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ color: "#fff", fontSize: "20px", margin: "0 0 20px 0" }}>Escalation Analysis</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Total Escalations" value={escalationStats.totalEscalations.toString()} />
        <StatCard label="True Positive Rate" value={`${escalationStats.truePositiveRate}%`} color="#00b894" />
        <StatCard label="False Alarm Rate" value={`${escalationStats.falseAlarmRate}%`} color={escalationStats.falseAlarmRate > 10 ? "#ff7675" : "#fdcb6e"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <StatCard label="Avg Response Time" value={`${escalationStats.avgResponseTimeSec}s`} />
        <StatCard label="Panic-Induced Rate" value={`${escalationStats.panicInducedRate}%`} color={escalationStats.panicInducedRate > 10 ? "#ff7675" : "#00b894"} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.06)", textAlign: "center"
    }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

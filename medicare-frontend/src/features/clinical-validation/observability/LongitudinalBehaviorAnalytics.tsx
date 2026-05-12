/**
 * LongitudinalBehaviorAnalytics — Tracks how the AI's reasoning behavior
 * evolves over weeks of operation: are its hypotheses getting more accurate?
 * Is drift increasing? Are escalation patterns shifting?
 */
import React from "react";

export default function LongitudinalBehaviorAnalytics() {
  const weeklySnapshots = [
    { week: "W1", consistency: 91, stability: 85, escalationAccuracy: 95 },
    { week: "W2", consistency: 93, stability: 88, escalationAccuracy: 96 },
    { week: "W3", consistency: 94, stability: 90, escalationAccuracy: 97 },
    { week: "W4", consistency: 96, stability: 92, escalationAccuracy: 98 },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ color: "#fff", fontSize: "20px", margin: "0 0 20px 0" }}>Longitudinal Behavior Trends</h2>
      
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th style={{ padding: "12px", textAlign: "left", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Week</th>
            <th style={{ padding: "12px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Consistency</th>
            <th style={{ padding: "12px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Stability</th>
            <th style={{ padding: "12px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Escalation Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {weeklySnapshots.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "12px", fontWeight: 600 }}>{row.week}</td>
              <td style={{ padding: "12px", textAlign: "center" }}>
                <span style={{ color: row.consistency > 93 ? "#00b894" : "#fdcb6e" }}>{row.consistency}%</span>
              </td>
              <td style={{ padding: "12px", textAlign: "center" }}>
                <span style={{ color: row.stability > 88 ? "#00b894" : "#fdcb6e" }}>{row.stability}%</span>
              </td>
              <td style={{ padding: "12px", textAlign: "center" }}>
                <span style={{ color: "#00b894" }}>{row.escalationAccuracy}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

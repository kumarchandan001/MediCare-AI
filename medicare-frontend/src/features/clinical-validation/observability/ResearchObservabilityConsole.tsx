/**
 * ResearchObservabilityConsole — The master dashboard for research teams
 * to observe the AI's reasoning patterns, benchmark trends, and trust
 * metrics in real time during clinical validation studies.
 */
import React, { useState } from "react";
import ValidationMetricsDashboard from "./ValidationMetricsDashboard";
import EscalationAnalysisCenter from "./EscalationAnalysisCenter";
import LongitudinalBehaviorAnalytics from "./LongitudinalBehaviorAnalytics";

type ConsoleTab = "metrics" | "escalations" | "behavior";

export default function ResearchObservabilityConsole() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("metrics");

  const tabs: { key: ConsoleTab; label: string }[] = [
    { key: "metrics", label: "Validation Metrics" },
    { key: "escalations", label: "Escalation Analysis" },
    { key: "behavior", label: "Longitudinal Behavior" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px 0" }}>
          Research Observability Console
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "14px" }}>
          Real-time monitoring of AI clinical reasoning quality, safety benchmarks, and trust evolution.
        </p>
      </header>

      <nav style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px", borderRadius: "6px", border: "none",
              background: activeTab === tab.key ? "rgba(9,132,227,0.2)" : "transparent",
              color: activeTab === tab.key ? "#74b9ff" : "rgba(255,255,255,0.5)",
              cursor: "pointer", fontWeight: activeTab === tab.key ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", minHeight: "500px" }}>
        {activeTab === "metrics" && <ValidationMetricsDashboard />}
        {activeTab === "escalations" && <EscalationAnalysisCenter />}
        {activeTab === "behavior" && <LongitudinalBehaviorAnalytics />}
      </main>
    </div>
  );
}

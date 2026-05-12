/**
 * ClinicalReviewWorkspace — The main dashboard interface where human medical
 * oversight professionals can review the AI's complex reasoning traces, overrides,
 * and escalations.
 */
import React, { useState } from "react";
import InvestigationReviewPanel from "./InvestigationReviewPanel";
import EscalationReviewFlow from "./EscalationReviewFlow";

export default function ClinicalReviewWorkspace() {
  const [activeTab, setActiveTab] = useState<"investigations" | "escalations">("investigations");

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "16px", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", fontWeight: 600 }}>Clinical Review Workspace</h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>
          Human-in-the-loop oversight interface for AI clinical reasoning validation.
        </p>
      </header>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <TabButton 
          active={activeTab === "investigations"} 
          onClick={() => setActiveTab("investigations")}
          label="Longitudinal Investigations"
        />
        <TabButton 
          active={activeTab === "escalations"} 
          onClick={() => setActiveTab("escalations")}
          label="Critical Escalations"
        />
      </div>

      <main style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", minHeight: "500px" }}>
        {activeTab === "investigations" ? <InvestigationReviewPanel /> : <EscalationReviewFlow />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        background: active ? "rgba(9, 132, 227, 0.2)" : "transparent",
        color: active ? "#74b9ff" : "rgba(255,255,255,0.6)",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}

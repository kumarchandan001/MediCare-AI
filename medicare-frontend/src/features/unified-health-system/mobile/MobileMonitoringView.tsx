/**
 * MobileMonitoringView — The primary top-level summary view for mobile,
 * displaying the overall health score, critical alerts, and active
 * tracking mode (e.g., "Active Recovery", "Maintenance").
 */
import React from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import { useAdaptiveHealthPlanning } from "../goals/AdaptiveHealthPlanning";

export default function MobileMonitoringView() {
  const ctx = useUnifiedHealthContext();
  const adaptivePlanner = useAdaptiveHealthPlanning();

  if (!ctx.unifiedState) return null;

  const plan = adaptivePlanner.generatePlan(ctx.unifiedState.domainSignals);

  const getModeColor = (mode: string) => {
    switch(mode) {
      case "recovery_first": return "#0984e3";
      case "preventive_shield": return "#fdcb6e";
      case "wellness_growth": return "#00b894";
      default: return "#a29bfe";
    }
  };

  const getModeLabel = (mode: string) => {
    switch(mode) {
      case "recovery_first": return "Active Recovery";
      case "preventive_shield": return "Preventive Focus";
      case "wellness_growth": return "Wellness Growth";
      default: return "Balanced Maintenance";
    }
  };

  return (
    <div style={{
      padding: "24px", borderRadius: "20px",
      background: `linear-gradient(135deg, ${getModeColor(plan.focusMode)}20 0%, rgba(26,26,46,0) 100%)`,
      border: `1px solid ${getModeColor(plan.focusMode)}40`,
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center"
    }}>
      <div style={{
        padding: "4px 12px", borderRadius: "12px",
        background: `${getModeColor(plan.focusMode)}20`,
        color: getModeColor(plan.focusMode),
        fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
        marginBottom: "16px"
      }}>
        {getModeLabel(plan.focusMode)}
      </div>

      <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "16px" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none" 
            stroke={getModeColor(plan.focusMode)} strokeWidth="6" 
            strokeDasharray={`${ctx.unifiedState.overallScore * 2.82} 282`} 
            strokeLinecap="round" 
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            {ctx.unifiedState.overallScore}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 1.5 }}>
        {plan.adaptedMessage}
      </p>
    </div>
  );
}

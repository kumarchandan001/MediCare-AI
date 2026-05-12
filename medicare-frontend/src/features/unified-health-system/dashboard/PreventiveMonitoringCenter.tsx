/**
 * PreventiveMonitoringCenter — Dashboard panel showing preventive health
 * alerts, burnout trajectory, lifestyle drift signals, and intervention plans.
 */
import React, { useMemo, useState } from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import { usePreventiveIntelligence } from "../preventive/PreventiveIntelligenceEngine";
import type { PreventiveAlert } from "../preventive/PreventiveIntelligenceEngine";

export default function PreventiveMonitoringCenter() {
  const ctx = useUnifiedHealthContext();
  const preventive = usePreventiveIntelligence();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const assessment = useMemo(() => {
    if (!ctx.unifiedState) return null;
    return preventive.assess(ctx.unifiedState.domainSignals);
  }, [ctx.unifiedState, preventive]);

  if (!assessment) return null;

  const riskColors: Record<string, string> = {
    low: "#00b894", moderate: "#fdcb6e", elevated: "#e17055", high: "#ff6b6b",
  };

  return (
    <div style={{
      padding: "20px", borderRadius: "16px",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "15px" }}>
          🛡️ Preventive Health Monitor
        </h3>
        <div style={{
          padding: "4px 12px", borderRadius: "10px",
          background: `${riskColors[assessment.riskProfile]}15`,
          color: riskColors[assessment.riskProfile],
          fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
        }}>
          {assessment.riskProfile} risk
        </div>
      </div>

      {/* Score Ring */}
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "16px", borderRadius: "14px",
        background: "rgba(255,255,255,0.03)", marginBottom: "16px",
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: `conic-gradient(${riskColors[assessment.riskProfile]} ${assessment.overallPreventiveScore * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%", background: "#1a1a2e",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: riskColors[assessment.riskProfile] }}>
              {assessment.overallPreventiveScore}
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5 }}>
            {assessment.proactiveNarrative}
          </p>
        </div>
      </div>

      {/* Focus Areas */}
      {assessment.focusAreas.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "8px" }}>
            Focus Areas
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {assessment.focusAreas.map(area => (
              <span key={area.domain} style={{
                padding: "5px 10px", borderRadius: "8px", fontSize: "12px",
                background: "rgba(255,107,107,0.08)",
                color: "#ff6b6b",
                border: "1px solid rgba(255,107,107,0.15)",
              }}>
                {area.reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {assessment.alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {assessment.alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isExpanded={expandedAlert === alert.id}
              onToggle={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
            />
          ))}
        </div>
      )}

      {assessment.alerts.length === 0 && (
        <div style={{
          textAlign: "center", padding: "24px",
          color: "rgba(0,184,148,0.7)", fontSize: "13px",
        }}>
          ✅ No preventive alerts at this time. Your health indicators look good.
        </div>
      )}

      {/* Next Check */}
      <div style={{
        marginTop: "16px", textAlign: "center",
        color: "rgba(255,255,255,0.3)", fontSize: "11px",
      }}>
        Next recommended check: {new Date(assessment.nextRecommendedCheck).toLocaleDateString()}
      </div>
    </div>
  );
}

function AlertCard({ alert, isExpanded, onToggle }: {
  alert: PreventiveAlert; isExpanded: boolean; onToggle: () => void;
}) {
  const severityColors: Record<string, string> = {
    urgent: "#ff6b6b", warning: "#e17055", attention: "#fdcb6e", watch: "#a29bfe",
  };
  const color = severityColors[alert.severity] || "#a29bfe";

  return (
    <div style={{
      borderRadius: "12px", overflow: "hidden",
      border: `1px solid ${color}20`, background: `${color}08`,
    }}>
      <div onClick={onToggle} style={{
        padding: "12px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: 600 }}>
            {alert.title}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "2px" }}>
            {alert.narrative.slice(0, 80)}...
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.65)", fontSize: "13px", lineHeight: 1.6 }}>
            {alert.narrative}
          </p>
          {alert.suggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {alert.suggestions.map((suggestion, i) => (
                <div key={i} style={{
                  padding: "8px 12px", borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)", fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                }}>
                  💡 {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

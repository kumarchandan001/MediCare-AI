/**
 * UnifiedHealthDashboard — Top-level dashboard component rendering the
 * unified health score, domain cards, cross-domain insights, and active
 * alerts in a cohesive, visually rich layout.
 */
import React, { useMemo } from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

const DOMAIN_META: Record<HealthDomain, { icon: string; label: string; color: string }> = {
  disease_intelligence: { icon: "🔬", label: "Investigations", color: "#ff6b6b" },
  wearable: { icon: "⌚", label: "Wearable", color: "#4ecdc4" },
  recovery: { icon: "💚", label: "Recovery", color: "#45b7d1" },
  sleep: { icon: "🌙", label: "Sleep", color: "#6c5ce7" },
  activity: { icon: "🏃", label: "Activity", color: "#00b894" },
  nutrition: { icon: "🥗", label: "Nutrition", color: "#fdcb6e" },
  medication: { icon: "💊", label: "Medication", color: "#e17055" },
  wellness: { icon: "✨", label: "Wellness", color: "#a29bfe" },
  coaching: { icon: "🧭", label: "Coaching", color: "#55a3f0" },
  preventive: { icon: "🛡️", label: "Preventive", color: "#00cec9" },
  emotional: { icon: "🧠", label: "Emotional", color: "#fd79a8" },
};

export default function UnifiedHealthDashboard() {
  const ctx = useUnifiedHealthContext();
  const { unifiedState, activeAlerts, crossDomainInsights, healthNarrative, isComputing } = ctx;

  const scoreColor = useMemo(() => {
    if (!unifiedState) return "#666";
    if (unifiedState.overallScore >= 75) return "#00b894";
    if (unifiedState.overallScore >= 55) return "#fdcb6e";
    if (unifiedState.overallScore >= 35) return "#e17055";
    return "#ff6b6b";
  }, [unifiedState]);

  const trendIcon = useMemo(() => {
    if (!unifiedState) return "—";
    const map = { improving: "📈", stable: "➡️", declining: "📉", insufficient_data: "🔄" };
    return map[unifiedState.overallTrend];
  }, [unifiedState]);

  if (isComputing || !unifiedState) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🧬</div>
        <div style={{ fontSize: "13px" }}>Synthesizing your health picture...</div>
      </div>
    );
  }

  return (
    <div className="unified-health-dashboard" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Overall Health Score ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "20px",
        padding: "24px", borderRadius: "20px",
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `conic-gradient(${scoreColor} ${unifiedState.overallScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          position: "relative",
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#1a1a2e", display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column",
          }}>
            <span style={{ fontSize: "22px", fontWeight: 700, color: scoreColor }}>{unifiedState.overallScore}</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>HEALTH</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <h3 style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "16px" }}>Health Overview</h3>
            <span style={{ fontSize: "14px" }}>{trendIcon}</span>
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.5 }}>
            {healthNarrative}
          </p>
        </div>
      </div>

      {/* ── Active Alerts ── */}
      {activeAlerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeAlerts.slice(0, 3).map((alert, i) => (
            <div key={i} style={{
              padding: "12px 16px", borderRadius: "12px",
              background: alert.level === "urgent" ? "rgba(255,107,107,0.1)" :
                alert.level === "warning" ? "rgba(253,203,110,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${alert.level === "urgent" ? "rgba(255,107,107,0.2)" :
                alert.level === "warning" ? "rgba(253,203,110,0.2)" : "rgba(255,255,255,0.06)"}`,
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "14px" }}>
                {alert.level === "urgent" ? "🚨" : alert.level === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", flex: 1 }}>
                {alert.message}
              </span>
              <button onClick={() => ctx.dismissAlert(i)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                cursor: "pointer", fontSize: "16px", padding: "4px",
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Domain Cards Grid ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px",
      }}>
        {ctx.domainSignals.map(signal => {
          const meta = DOMAIN_META[signal.domain];
          return (
            <DomainCard key={signal.domain} signal={signal} meta={meta} />
          );
        })}
      </div>

      {/* ── Cross-Domain Insights ── */}
      {crossDomainInsights.length > 0 && (
        <div style={{
          padding: "16px", borderRadius: "14px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h4 style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.7)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            🔗 Cross-System Insights
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {crossDomainInsights.slice(0, 3).map(insight => (
              <div key={insight.id} style={{
                padding: "10px 14px", borderRadius: "10px",
                background: insight.impact === "positive" ? "rgba(0,184,148,0.06)" :
                  insight.impact === "negative" ? "rgba(255,107,107,0.06)" : "rgba(255,255,255,0.03)",
                borderLeft: `3px solid ${insight.impact === "positive" ? "#00b894" :
                  insight.impact === "negative" ? "#ff6b6b" : "#a29bfe"}`,
              }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: 1.5 }}>
                  {insight.insight}
                </p>
                {insight.actionSuggestion && (
                  <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px", fontStyle: "italic" }}>
                    💡 {insight.actionSuggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainCard({ signal, meta }: { signal: DomainSignal; meta: { icon: string; label: string; color: string } }) {
  const trendArrow = signal.trend === "improving" ? "↑" : signal.trend === "declining" ? "↓" : "→";
  const trendColor = signal.trend === "improving" ? "#00b894" : signal.trend === "declining" ? "#ff6b6b" : "rgba(255,255,255,0.4)";

  return (
    <div style={{
      padding: "14px", borderRadius: "14px",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      transition: "all 0.2s ease", cursor: "default",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "18px" }}>{meta.icon}</span>
        <span style={{ fontSize: "12px", color: trendColor, fontWeight: 600 }}>{trendArrow}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: meta.color, marginBottom: "4px" }}>
        {signal.score}
      </div>
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{meta.label}</div>
      <div style={{
        marginTop: "8px", height: "3px", borderRadius: "2px",
        background: "rgba(255,255,255,0.06)",
      }}>
        <div style={{
          height: "100%", borderRadius: "2px", width: `${signal.score}%`,
          background: `linear-gradient(90deg, ${meta.color}60, ${meta.color})`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

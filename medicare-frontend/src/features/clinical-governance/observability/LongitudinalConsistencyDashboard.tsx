/**
 * LongitudinalConsistencyDashboard — UI Component showing longitudinal
 * health of the governance system. Charts investigation trends, escalation
 * frequency, audit integrity, and wearable reliability over time.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface DashboardProps {
  metrics: {
    investigations: { total: number; completed: number; errors: number };
    escalations: { total: number; moderationRate: number; critical: number };
    safety: { violations: number; blockRate: number };
    governance: { passRate: number; totalPasses: number; avgTrustDelta: number };
    wearable: { avgReliability: number; fallbackSessions: number };
  };
  auditIntegrity: number;
  trustGrade: string;
}

export default function LongitudinalConsistencyDashboard({ metrics, auditIntegrity, trustGrade }: DashboardProps) {
  const [expanded, setExpanded] = useState(false);

  const gradeColors: Record<string, string> = {
    excellent: theme.colors.health.recovery.DEFAULT,
    good: "#2ed573",
    fair: theme.colors.health.warning.DEFAULT,
    needs_attention: theme.colors.health.strain.DEFAULT,
  };

  const cards = [
    { label: "Investigations", value: metrics.investigations.total, sub: `${metrics.investigations.completed} completed`, icon: "fa-stethoscope", color: theme.colors.accent.primary },
    { label: "Governance", value: `${(metrics.governance.passRate * 100).toFixed(0)}%`, sub: `${metrics.governance.totalPasses} passes`, icon: "fa-shield-check", color: theme.colors.health.recovery.DEFAULT },
    { label: "Safety", value: metrics.safety.violations, sub: `${(metrics.safety.blockRate * 100).toFixed(0)}% blocked`, icon: "fa-heart-pulse", color: metrics.safety.violations > 5 ? theme.colors.health.strain.DEFAULT : theme.colors.health.warning.DEFAULT },
    { label: "Audit Integrity", value: `${auditIntegrity}%`, sub: trustGrade, icon: "fa-clipboard-check", color: gradeColors[trustGrade] || "rgba(255,255,255,0.5)" },
  ];

  return (
    <div style={{
      background: "rgba(8, 12, 12, 0.6)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-chart-bar" style={{ fontSize: "0.6rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
            System Health Overview
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: "0.48rem", padding: "2px 8px", borderRadius: 4,
            background: `${gradeColors[trustGrade] || "rgba(255,255,255,0.1)"}15`,
            color: gradeColors[trustGrade] || "rgba(255,255,255,0.5)",
            fontWeight: 700,
          }}>
            {trustGrade}
          </span>
          <i className="fas fa-chevron-down" style={{
            fontSize: "0.45rem", color: "rgba(255,255,255,0.3)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s",
          }} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "12px 14px" }}>
              {/* Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {cards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <i className={`fas ${card.icon}`} style={{ fontSize: "0.45rem", color: card.color }} />
                      <span style={{ fontSize: "0.45rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{card.label}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{card.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* Escalation Summary */}
              <div style={{
                marginTop: 10, padding: "8px 10px", borderRadius: 6,
                background: "rgba(0,0,0,0.15)",
                fontSize: "0.48rem", color: "rgba(255,255,255,0.4)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Escalation moderation rate</span>
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{(metrics.escalations.moderationRate * 100).toFixed(0)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Critical escalations</span>
                  <span style={{ fontWeight: 700, color: metrics.escalations.critical > 0 ? theme.colors.health.strain.DEFAULT : "rgba(255,255,255,0.6)" }}>{metrics.escalations.critical}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Wearable reliability</span>
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{metrics.wearable.avgReliability.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

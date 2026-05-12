/**
 * InvestigationTransparencyViewer — Full investigation audit viewer with
 * timeline visualization. Shows reasoning evolution, escalation path,
 * confidence changes. Embeds traceability components.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import ConfidenceEvolutionGraph from "../traceability/ConfidenceEvolutionGraph";
import EscalationDecisionPath from "../traceability/EscalationDecisionPath";

interface AuditEvent {
  timestamp: number;
  action: string;
  detail: string;
  impact: "low" | "medium" | "high" | "critical";
  outcome: string;
}

interface Props {
  events: AuditEvent[];
  conditionHistory: { turn: number; timestamp: number; confidence: number; rank: number }[];
  conditionName: string;
  escalationSteps: { stage: string; level: string; reason: string; wasModified: boolean }[];
  finalEscalation: string;
  governanceApproved: boolean;
}

export default function InvestigationTransparencyViewer({
  events, conditionHistory, conditionName, escalationSteps,
  finalEscalation, governanceApproved,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"timeline" | "confidence" | "escalation">("timeline");

  const impactColors: Record<string, string> = {
    low: "rgba(255,255,255,0.3)",
    medium: theme.colors.health.warning.DEFAULT,
    high: "#ff9f43",
    critical: theme.colors.health.strain.DEFAULT,
  };

  return (
    <div style={{
      background: "rgba(8, 12, 12, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 12, overflow: "hidden", marginTop: 8,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer", background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-timeline" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Investigation Audit Trail
          </span>
          <span style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.3)" }}>
            {events.length} events
          </span>
        </div>
        <i className="fas fa-chevron-down" style={{
          fontSize: "0.42rem", color: "rgba(255,255,255,0.3)",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "8px 12px" }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {(["timeline", "confidence", "escalation"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "4px 10px", borderRadius: 5, border: "none",
                      background: tab === t ? `${theme.colors.accent.primary}20` : "rgba(0,0,0,0.15)",
                      color: tab === t ? theme.colors.accent.primary : "rgba(255,255,255,0.4)",
                      fontSize: "0.45rem", fontWeight: 700, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Timeline Tab */}
              {tab === "timeline" && (
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {events.length === 0 ? (
                    <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>
                      No audit events recorded yet.
                    </div>
                  ) : events.slice(-15).reverse().map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{
                        display: "flex", gap: 8, padding: "5px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.02)",
                      }}
                    >
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%", marginTop: 3, flexShrink: 0,
                        background: impactColors[event.impact] || "rgba(255,255,255,0.2)",
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                          {event.action}
                        </div>
                        <div style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                          {event.detail}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Confidence Tab */}
              {tab === "confidence" && (
                <ConfidenceEvolutionGraph
                  conditionHistory={conditionHistory}
                  conditionName={conditionName}
                />
              )}

              {/* Escalation Tab */}
              {tab === "escalation" && (
                <EscalationDecisionPath
                  steps={escalationSteps}
                  finalLevel={finalEscalation}
                  governanceApproved={governanceApproved}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

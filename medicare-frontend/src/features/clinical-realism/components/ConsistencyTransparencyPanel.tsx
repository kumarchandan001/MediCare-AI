/**
 * ConsistencyTransparencyPanel — A collapsible panel that shows users
 * the clinical reasoning decisions made during the investigation.
 * Supports progressive disclosure: summary by default, expandable detail.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

export interface DecisionEntry {
  category: string;
  summary: string;
  detail: string;
  impact: "low" | "medium" | "high";
  timestamp: number;
}

interface Props {
  decisions: DecisionEntry[];
  escalationEvents: { from: string; to: string; wasModerated: boolean; reason: string }[];
  uncertaintyNarrative: string;
  coherenceScore: number;
}

export default function ConsistencyTransparencyPanel({
  decisions,
  escalationEvents,
  uncertaintyNarrative,
  coherenceScore,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detailIdx, setDetailIdx] = useState<number | null>(null);

  const significant = decisions.filter(d => d.impact === "medium" || d.impact === "high");
  const moderatedEsc = escalationEvents.filter(e => e.wasModerated);

  if (significant.length === 0 && moderatedEsc.length === 0) return null;

  const categoryIcons: Record<string, string> = {
    hypothesis_change: "fa-arrows-turn-right",
    escalation_change: "fa-stairs",
    confidence_moderation: "fa-scale-balanced",
    wearable_moderation: "fa-watch",
    uncertainty_acknowledgement: "fa-circle-question",
    pacing_adjustment: "fa-gauge-simple",
    recovery_assessment: "fa-heart-pulse",
    contradiction_resolution: "fa-code-compare",
    edge_case_handling: "fa-triangle-exclamation",
  };

  const impactColors: Record<string, string> = {
    low: "rgba(255,255,255,0.3)",
    medium: theme.colors.health.warning.DEFAULT,
    high: theme.colors.health.strain.DEFAULT,
  };

  return (
    <div style={{
      marginTop: 12,
      borderRadius: 12,
      background: "rgba(12, 16, 16, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          cursor: "pointer",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-list-check" style={{ color: theme.colors.accent.primary, fontSize: "0.65rem" }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Reasoning Transparency
          </span>
          <span style={{
            fontSize: "0.48rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(0,245,200,0.08)",
            color: "rgba(0,245,200,0.6)",
          }}>
            {significant.length} decision{significant.length !== 1 ? "s" : ""}
          </span>
        </div>
        <i className={`fas fa-chevron-down`} style={{
          fontSize: "0.5rem",
          color: "rgba(255,255,255,0.3)",
          transition: "transform 0.3s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
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
            <div style={{ padding: "12px 14px" }}>
              {/* Coherence score */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                padding: "6px 10px",
                background: "rgba(0,0,0,0.15)",
                borderRadius: 6,
              }}>
                <i className="fas fa-shield-halved" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
                <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.6)" }}>
                  Coherence: <strong style={{ color: coherenceScore >= 70 ? theme.colors.health.recovery.DEFAULT : theme.colors.health.warning.DEFAULT }}>
                    {coherenceScore}%
                  </strong>
                </span>
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>
                  {uncertaintyNarrative}
                </span>
              </div>

              {/* Decision entries */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {significant.slice(-8).reverse().map((dec, i) => (
                  <div
                    key={i}
                    onClick={() => setDetailIdx(detailIdx === i ? null : i)}
                    style={{
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.12)",
                      borderRadius: 6,
                      cursor: "pointer",
                      borderLeft: `2px solid ${impactColors[dec.impact]}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <i className={`fas ${categoryIcons[dec.category] || "fa-circle"}`}
                        style={{ fontSize: "0.5rem", color: impactColors[dec.impact] }} />
                      <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                        {dec.summary}
                      </span>
                    </div>
                    <AnimatePresence>
                      {detailIdx === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{
                            marginTop: 6,
                            fontSize: "0.5rem",
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.5,
                            paddingLeft: 16,
                          }}>
                            {dec.detail}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Escalation moderations */}
              {moderatedEsc.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", marginBottom: 6, fontWeight: 600 }}>
                    Escalation Moderations:
                  </div>
                  {moderatedEsc.slice(-3).map((esc, i) => (
                    <div key={i} style={{
                      fontSize: "0.48rem",
                      color: "rgba(255,255,255,0.5)",
                      padding: "4px 8px",
                      background: "rgba(0,245,200,0.04)",
                      borderRadius: 4,
                      marginBottom: 4,
                    }}>
                      <i className="fas fa-shield-heart" style={{ marginRight: 6, color: theme.colors.accent.primary, fontSize: "0.4rem" }} />
                      {esc.from} → {esc.to} {esc.wasModerated ? "(moderated)" : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

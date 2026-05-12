/**
 * ContradictionInsightView — Shows contradictions as investigation refinements
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

export default function ContradictionInsightView() {
  const { governance, predictionResult } = useInvestigation();
  const [expanded, setExpanded] = useState(false);

  if (!governance || !predictionResult) return null;

  const adjustments = governance.confidence_adjustments || [];
  const hasContradictionPenalty = adjustments.some(a =>
    a.reasons.some(r => r.toLowerCase().includes("contradiction"))
  );
  const ambiguityActions = governance.ambiguity?.preservation_actions || [];

  if (!hasContradictionPenalty && ambiguityActions.length === 0) return null;

  const insights: { icon: string; title: string; text: string }[] = [];

  if (hasContradictionPenalty) {
    const penalty = adjustments.find(a =>
      a.reasons.some(r => r.toLowerCase().includes("contradiction"))
    );
    const penaltyReason = penalty?.reasons.find(r => r.toLowerCase().includes("contradiction")) || "";
    insights.push({
      icon: "fa-arrows-split-up-and-left",
      title: "Confidence Adjusted for Contradictions",
      text: `Some symptom patterns create conflicting signals. The system has ${penaltyReason || "applied a contradiction penalty"} to maintain safe reasoning boundaries.`,
    });
  }

  ambiguityActions.forEach(action => {
    insights.push({
      icon: "fa-magnifying-glass-chart",
      title: action.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      text: action.action,
    });
  });

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="ucw-section-icon" style={{ background: "rgba(156,111,255,0.1)", color: theme.colors.health.sleep.DEFAULT }}>
          <i className="fas fa-arrows-split-up-and-left" />
        </div>
        <div className="ucw-section-title">Contradiction Analysis</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(156,111,255,0.08)", color: theme.colors.health.sleep.DEFAULT,
          border: `1px solid rgba(156,111,255,0.15)`,
        }}>
          {insights.length} signal{insights.length > 1 ? "s" : ""}
        </span>
        <i className={`fas fa-chevron-down ucw-section-chevron ${expanded ? "expanded" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="ucw-section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  className="ucw-insight-card"
                  style={{
                    background: "rgba(156,111,255,0.04)",
                    border: "1px solid rgba(156,111,255,0.1)",
                  }}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="ucw-insight-icon" style={{
                    background: "rgba(156,111,255,0.1)",
                    color: theme.colors.health.sleep.DEFAULT,
                  }}>
                    <i className={`fas ${insight.icon}`} />
                  </div>
                  <div className="ucw-insight-content">
                    <div className="ucw-insight-title" style={{ color: theme.colors.health.sleep.DEFAULT }}>
                      {insight.title}
                    </div>
                    <div className="ucw-insight-text">{insight.text}</div>
                  </div>
                </motion.div>
              ))}

              <div style={{
                fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6,
                padding: "8px 10px", borderRadius: 8, background: "rgba(24,31,27,0.3)",
              }}>
                Contradictions help refine the investigation. When symptoms point in different
                directions, the system adjusts its confidence to reflect this complexity honestly.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * DifferentialReasoningFlow — Hypothesis evolution cards
 * Shows primary + alternatives with confidence bars and evidence reasoning
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

export default function DifferentialReasoningFlow() {
  const { predictionResult, governance } = useInvestigation();
  const [expanded, setExpanded] = useState(true);

  if (!predictionResult) return null;

  const xai = predictionResult.xai;
  const alts = xai.alternative_diagnoses || [];
  const govHypotheses = governance?.governed_hypotheses || [];

  // Build hypothesis list: primary + alternatives
  const hypotheses = [
    {
      name: predictionResult.predicted_disease,
      confidence: govHypotheses[0]?.confidence
        ? govHypotheses[0].confidence * 100
        : predictionResult.confidence,
      rawConfidence: predictionResult.confidence,
      reason: xai.xai_summary?.split(".")[0] || "Primary evidence pattern match",
      isPrimary: true,
      wasGoverned: !!govHypotheses[0],
    },
    ...alts.slice(0, 3).map((alt, i) => ({
      name: alt.disease,
      confidence: typeof alt.probability === "number" ? alt.probability : parseFloat(String(alt.confidence)) || 0,
      rawConfidence: typeof alt.probability === "number" ? alt.probability : 0,
      reason: alt.reason || "Alternative evidence pattern",
      isPrimary: false,
      wasGoverned: false,
    })),
  ];

  const colors = [
    theme.colors.accent.primary,
    theme.colors.health.strain.DEFAULT,
    theme.colors.health.sleep.DEFAULT,
    theme.colors.health.warning.DEFAULT,
  ];

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="ucw-section-icon" style={{ background: "rgba(0,180,255,0.1)", color: theme.colors.health.strain.DEFAULT }}>
          <i className="fas fa-code-branch" />
        </div>
        <div className="ucw-section-title">Differential Reasoning</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,180,255,0.08)", color: theme.colors.health.strain.DEFAULT,
          border: `1px solid rgba(0,180,255,0.15)`,
        }}>
          {hypotheses.length} hypothes{hypotheses.length > 1 ? "es" : "is"}
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
            <div className="ucw-section-body">
              <div className="ucw-hypothesis-list">
                {hypotheses.map((h, i) => (
                  <motion.div
                    key={h.name}
                    className={`ucw-hypothesis-card ${h.isPrimary ? "primary" : ""}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                  >
                    <div className="ucw-hypothesis-rank" style={{
                      background: `${colors[i]}15`,
                      color: colors[i],
                      border: `1px solid ${colors[i]}25`,
                    }}>
                      {i + 1}
                    </div>

                    <div className="ucw-hypothesis-info">
                      <div className="ucw-hypothesis-name">{h.name}</div>
                      <div className="ucw-hypothesis-reason">{h.reason}</div>
                      <div className="ucw-hypothesis-bar-track">
                        <motion.div
                          className="ucw-hypothesis-bar-fill"
                          initial={{ width: "0%" }}
                          animate={{ width: `${Math.min(h.confidence, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                          style={{ background: colors[i], boxShadow: `0 0 6px ${colors[i]}60` }}
                        />
                      </div>
                    </div>

                    <div className="ucw-hypothesis-pct" style={{ color: colors[i] }}>
                      {h.confidence.toFixed(1)}%
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Reasoning note */}
              <div style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 10,
                background: "rgba(24,31,27,0.5)", border: "1px solid rgba(255,255,255,0.04)",
                fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="fas fa-circle-info" style={{ color: "rgba(0,245,200,0.5)", flexShrink: 0 }} />
                Hypotheses are ranked by evidence pattern strength. The AI continuously evaluates
                all possibilities — only a healthcare professional can confirm the actual condition.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

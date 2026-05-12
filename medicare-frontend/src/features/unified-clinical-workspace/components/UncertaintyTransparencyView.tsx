/**
 * UncertaintyTransparencyView — Normalizes uncertainty as part of clinical reasoning
 * Shows ambiguity, incomplete evidence, and overlapping conditions as calm investigation states
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

export default function UncertaintyTransparencyView() {
  const { governance, predictionResult } = useInvestigation();
  const [expanded, setExpanded] = useState(false);

  if (!predictionResult || !governance) return null;

  const ambiguity = governance.ambiguity;
  const uncertainty = governance.uncertainty;
  const alts = predictionResult.xai.alternative_diagnoses || [];
  const ambiguityPct = Math.round((ambiguity?.ambiguity_score ?? 0) * 100);

  // Only show if there's meaningful uncertainty to communicate
  const hasOverlap = alts.length > 0;
  const hasAmbiguity = ambiguityPct > 15;
  const hasWarnings = (uncertainty?.warnings?.length || 0) > 0;

  if (!hasOverlap && !hasAmbiguity && !hasWarnings) return null;

  // Build insight messages
  const insights: { icon: string; title: string; text: string; color: string }[] = [];

  if (hasAmbiguity) {
    insights.push({
      icon: "fa-circle-half-stroke",
      title: `Ambiguity: ${ambiguity.ambiguity_level}`,
      text: ambiguity.summary || `Current evidence leaves ${ambiguityPct}% ambiguity. This is normal during early investigation — additional information would help narrow the assessment.`,
      color: theme.colors.health.warning.DEFAULT,
    });
  }

  if (hasOverlap) {
    const overlapNames = alts.slice(0, 2).map(a => a.disease).join(" and ");
    insights.push({
      icon: "fa-circle-nodes",
      title: "Overlapping Conditions",
      text: `Some symptoms overlap between the primary finding and ${overlapNames}. This is medically common — many conditions share symptom patterns.`,
      color: theme.colors.health.strain.DEFAULT,
    });
  }

  if (ambiguity?.should_preserve) {
    insights.push({
      icon: "fa-shield-halved",
      title: "Ambiguity Preserved",
      text: "The system is intentionally maintaining uncertainty rather than forcing a premature conclusion. This protects against overconfident reasoning.",
      color: theme.colors.accent.primary,
    });
  }

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="ucw-section-icon" style={{ background: "rgba(255,179,0,0.1)", color: theme.colors.health.warning.DEFAULT }}>
          <i className="fas fa-circle-half-stroke" />
        </div>
        <div className="ucw-section-title">Uncertainty & Ambiguity</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(255,179,0,0.08)", color: theme.colors.health.warning.DEFAULT,
          border: `1px solid rgba(255,179,0,0.15)`,
        }}>
          {ambiguityPct}% ambiguity
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
                  style={{ background: `${insight.color}06`, border: `1px solid ${insight.color}12` }}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="ucw-insight-icon" style={{ background: `${insight.color}12`, color: insight.color }}>
                    <i className={`fas ${insight.icon}`} />
                  </div>
                  <div className="ucw-insight-content">
                    <div className="ucw-insight-title" style={{ color: insight.color }}>{insight.title}</div>
                    <div className="ucw-insight-text">{insight.text}</div>
                  </div>
                </motion.div>
              ))}

              <div style={{
                fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6,
                padding: "8px 10px", borderRadius: 8, background: "rgba(24,31,27,0.3)",
              }}>
                Uncertainty is a normal part of clinical reasoning. It indicates the system is being
                transparent about the limits of available evidence rather than forcing false certainty.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

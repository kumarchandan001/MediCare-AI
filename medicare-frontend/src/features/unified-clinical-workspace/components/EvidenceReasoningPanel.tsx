/**
 * EvidenceReasoningPanel — Calm evidence visualization
 * Shows strong, moderate, weak, conflicting, and missing evidence
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

interface EvidenceItem {
  label: string;
  description: string;
  strength: "strong" | "moderate" | "weak" | "conflicting" | "missing";
}

export default function EvidenceReasoningPanel() {
  const { predictionResult, governance } = useInvestigation();
  const [expanded, setExpanded] = useState(true);

  if (!predictionResult) return null;

  const xai = predictionResult.xai;
  const contributions = xai.feature_contributions || [];
  const contradictions = governance?.ambiguity?.preservation_actions || [];

  // Build evidence items from feature contributions
  const evidenceItems: EvidenceItem[] = contributions.slice(0, 6).map(fc => ({
    label: fc.display_name,
    description: `${fc.severity_label} severity • ${fc.contribution_pct.toFixed(1)}% contribution`,
    strength: fc.severity_label === "Critical" || fc.severity_label === "High"
      ? "strong"
      : fc.severity_label === "Moderate"
        ? "moderate"
        : "weak",
  }));

  // Add conflicting evidence from contradictions
  contradictions.forEach(c => {
    evidenceItems.push({
      label: c.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      description: c.action,
      strength: "conflicting",
    });
  });

  // Add missing evidence indicators
  const unmatched = predictionResult.unmatched_symptoms || [];
  if (unmatched.length > 0) {
    evidenceItems.push({
      label: `${unmatched.length} Unmatched Symptom${unmatched.length > 1 ? "s" : ""}`,
      description: `${unmatched.slice(0, 3).map(s => s.replace(/_/g, " ")).join(", ")}${unmatched.length > 3 ? "…" : ""}`,
      strength: "missing",
    });
  }

  const strengthLabels = {
    strong: "Supporting",
    moderate: "Moderate",
    weak: "Weak",
    conflicting: "Conflicting",
    missing: "Missing",
  };

  const strengthColors = {
    strong: theme.colors.health.recovery.DEFAULT,
    moderate: theme.colors.health.warning.DEFAULT,
    weak: "rgba(255,255,255,0.4)",
    conflicting: theme.colors.health.danger.DEFAULT,
    missing: "rgba(255,255,255,0.2)",
  };

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="ucw-section-icon" style={{ background: "rgba(0,230,118,0.1)", color: theme.colors.health.recovery.DEFAULT }}>
          <i className="fas fa-flask" />
        </div>
        <div className="ucw-section-title">Evidence Landscape</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,230,118,0.08)", color: theme.colors.health.recovery.DEFAULT,
          border: `1px solid rgba(0,230,118,0.15)`,
        }}>
          {evidenceItems.length} signals
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
              {/* Evidence strength summary bar */}
              <div style={{
                display: "flex", gap: 4, marginBottom: 14,
                padding: "8px 10px", borderRadius: 8,
                background: "rgba(24,31,27,0.5)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                {(["strong", "moderate", "weak", "conflicting", "missing"] as const).map(s => {
                  const count = evidenceItems.filter(e => e.strength === s).length;
                  if (count === 0) return null;
                  return (
                    <span key={s} style={{
                      fontSize: "0.55rem", padding: "2px 6px", borderRadius: 6,
                      background: `${strengthColors[s]}10`,
                      color: strengthColors[s],
                      border: `1px solid ${strengthColors[s]}20`,
                      fontWeight: 700,
                    }}>
                      {count} {strengthLabels[s]}
                    </span>
                  );
                })}
              </div>

              {/* Evidence items grid */}
              <div className="ucw-evidence-grid">
                {evidenceItems.map((item, i) => (
                  <motion.div
                    key={`${item.label}-${i}`}
                    className="ucw-evidence-item"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <div className={`ucw-evidence-dot ${item.strength}`} />
                    <div>
                      <div className="ucw-evidence-label">{item.label}</div>
                      <div className="ucw-evidence-desc">{item.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

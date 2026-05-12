/**
 * TrustSafetyFooter — Consolidated trust indicators and safety disclaimer
 * Shows reasoning stability, evidence sufficiency, governance compliance
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

export default function TrustSafetyFooter() {
  const {
    governance, predictionResult, emotionalSafety,
    governedConfidence, evidenceStrength, escalationLevel,
    ambiguityLevel, needsHumanReview, isEmergency,
  } = useInvestigation();

  if (!predictionResult) return null;

  const safetyScore = governance ? (governance.ethics.is_ethical && governance.safety.is_safe ? 100 : 60) : 80;
  const ambiguityPct = Math.round((governance?.ambiguity?.ambiguity_score ?? 0) * 100);
  const cognitiveLoad = emotionalSafety?.cognitive_load ?? 0;

  const trustItems = [
    {
      label: "Evidence",
      value: evidenceStrength,
      color: evidenceStrength === "Strong" || evidenceStrength === "Very Strong"
        ? theme.colors.health.recovery.DEFAULT
        : evidenceStrength === "Moderate"
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.health.danger.DEFAULT,
    },
    {
      label: "Safety",
      value: `${safetyScore}%`,
      color: safetyScore >= 80 ? theme.colors.health.recovery.DEFAULT : theme.colors.health.warning.DEFAULT,
    },
    {
      label: "Ambiguity",
      value: `${ambiguityPct}%`,
      color: ambiguityPct <= 20
        ? theme.colors.health.recovery.DEFAULT
        : ambiguityPct <= 50
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.health.danger.DEFAULT,
    },
    {
      label: "Escalation",
      value: escalationLevel.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      color: escalationLevel === "routine"
        ? theme.colors.health.recovery.DEFAULT
        : escalationLevel === "watchful"
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.health.danger.DEFAULT,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      {/* Human review recommendation */}
      {needsHumanReview && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", borderRadius: 12,
          background: "rgba(0,180,255,0.04)", border: "1px solid rgba(0,180,255,0.12)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(0,180,255,0.1)", color: theme.colors.health.strain.DEFAULT,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
          }}>
            <i className="fas fa-user-doctor" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: theme.colors.health.strain.DEFAULT }}>
              Professional Review Suggested
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              {governance?.human_review?.recommendation || "Based on the investigation results, consulting a healthcare professional is recommended."}
            </div>
          </div>
        </div>
      )}

      {/* Emergency banner */}
      {isEmergency && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", borderRadius: 12,
          background: "rgba(255,61,90,0.06)", border: "1px solid rgba(255,61,90,0.15)",
        }}>
          <i className="fas fa-phone-volume" style={{ fontSize: "1rem", color: theme.colors.health.danger.DEFAULT }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: theme.colors.health.danger.DEFAULT }}>
              Seek Immediate Medical Attention
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              {governance?.escalation?.action || "Please contact emergency services or visit the nearest emergency department immediately."}
            </div>
          </div>
        </div>
      )}

      {/* Trust indicators grid */}
      <div className="ucw-trust-grid">
        {trustItems.map(item => (
          <div key={item.label} className="ucw-trust-item">
            <div className="ucw-trust-value" style={{ color: item.color }}>{item.value}</div>
            <div className="ucw-trust-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="ucw-disclaimer">
        <i className="fas fa-triangle-exclamation ucw-disclaimer-icon" />
        <div className="ucw-disclaimer-text">
          {governance?.safety?.disclaimer ||
            "This assessment reflects probabilistic clinical reasoning and is not a medical diagnosis. Always consult a qualified healthcare professional for proper diagnosis and treatment."}
        </div>
      </div>
    </motion.div>
  );
}

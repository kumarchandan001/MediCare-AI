/**
 * EscalationDecisionPath — UI Component showing visual flowchart of
 * escalation decision path. Displays trigger → evaluation → moderation →
 * final level with reasoning at each node.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface EscalationStep {
  stage: string;
  level: string;
  reason: string;
  wasModified: boolean;
}

interface Props {
  steps: EscalationStep[];
  finalLevel: string;
  governanceApproved: boolean;
}

export default function EscalationDecisionPath({ steps, finalLevel, governanceApproved }: Props) {
  if (steps.length === 0) return null;

  const levelColors: Record<string, string> = {
    none: "rgba(255,255,255,0.25)",
    low: theme.colors.health.recovery.DEFAULT,
    moderate: theme.colors.health.warning.DEFAULT,
    elevated: "#ff9f43",
    critical: theme.colors.health.strain.DEFAULT,
    emergency: "#ff4757",
  };

  return (
    <div style={{
      background: "rgba(10, 14, 14, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 10,
      padding: "10px 14px",
      marginTop: 6,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <i className="fas fa-route" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
        <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          Escalation Path
        </span>
        <span style={{
          fontSize: "0.48rem", fontWeight: 700, marginLeft: "auto",
          padding: "2px 8px", borderRadius: 4,
          background: `${levelColors[finalLevel] || levelColors.none}15`,
          color: levelColors[finalLevel] || levelColors.none,
        }}>
          {finalLevel}
        </span>
        {governanceApproved && (
          <i className="fas fa-check-circle" style={{ fontSize: "0.45rem", color: theme.colors.health.recovery.DEFAULT }} title="Governance approved" />
        )}
      </div>

      {/* Flow */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {/* Node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 16 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: step.wasModified ? theme.colors.health.warning.DEFAULT : levelColors[step.level] || "rgba(255,255,255,0.2)",
                  border: step.wasModified ? "1.5px solid rgba(255,200,50,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                }} />
                {i < steps.length - 1 && (
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 6 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: "0.5rem", fontWeight: 700,
                    color: step.wasModified ? theme.colors.health.warning.DEFAULT : "rgba(255,255,255,0.6)",
                  }}>
                    {step.stage}
                  </span>
                  <span style={{
                    fontSize: "0.42rem", padding: "1px 5px", borderRadius: 3,
                    background: `${levelColors[step.level] || "rgba(255,255,255,0.1)"}12`,
                    color: levelColors[step.level] || "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}>
                    {step.level}
                  </span>
                  {step.wasModified && (
                    <span style={{
                      fontSize: "0.4rem", color: theme.colors.health.warning.DEFAULT,
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                      <i className="fas fa-shield-halved" style={{ fontSize: "0.35rem" }} />
                      moderated
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: "0.45rem", color: "rgba(255,255,255,0.35)", marginTop: 2, lineHeight: 1.4,
                }}>
                  {step.reason}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

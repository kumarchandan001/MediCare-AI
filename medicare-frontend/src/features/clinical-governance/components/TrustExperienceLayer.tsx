/**
 * TrustExperienceLayer — Always-visible trust signals bar showing system
 * health. Indicators: reasoning stability, audit completeness, safety
 * status, wearable reliability. Calm, non-intrusive design.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { TrustSignal } from "../TrustInfrastructureManager";

interface Props {
  signals: TrustSignal[];
  overallScore: number;
  grade: string;
}

export default function TrustExperienceLayer({ signals, overallScore, grade }: Props) {
  const gradeColors: Record<string, string> = {
    excellent: theme.colors.health.recovery.DEFAULT,
    good: "#2ed573",
    fair: theme.colors.health.warning.DEFAULT,
    needs_attention: theme.colors.health.strain.DEFAULT,
  };

  const statusIcons: Record<string, string> = {
    healthy: "fa-circle-check",
    degraded: "fa-circle-exclamation",
    critical: "fa-circle-xmark",
  };

  const statusColors: Record<string, string> = {
    healthy: theme.colors.health.recovery.DEFAULT,
    degraded: theme.colors.health.warning.DEFAULT,
    critical: theme.colors.health.strain.DEFAULT,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8,
        background: "rgba(8,12,12,0.5)",
        border: "1px solid rgba(255,255,255,0.03)",
        flexWrap: "wrap",
      }}
    >
      {/* Overall badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "2px 8px", borderRadius: 5,
        background: `${gradeColors[grade] || "rgba(255,255,255,0.1)"}10`,
        borderRight: "1px solid rgba(255,255,255,0.04)",
        paddingRight: 12, marginRight: 4,
      }}>
        <i className="fas fa-shield-heart" style={{ fontSize: "0.48rem", color: gradeColors[grade] || "rgba(255,255,255,0.4)" }} />
        <span style={{
          fontSize: "0.45rem", fontWeight: 800,
          color: gradeColors[grade] || "rgba(255,255,255,0.5)",
        }}>
          {overallScore}
        </span>
      </div>

      {/* Individual signals */}
      {signals.slice(0, 4).map((signal, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
          }}
          title={signal.detail}
        >
          <i className={`fas ${statusIcons[signal.status] || "fa-circle"}`} style={{
            fontSize: "0.38rem",
            color: statusColors[signal.status] || "rgba(255,255,255,0.3)",
          }} />
          <span style={{
            fontSize: "0.4rem", color: "rgba(255,255,255,0.4)", fontWeight: 600,
          }}>
            {signal.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

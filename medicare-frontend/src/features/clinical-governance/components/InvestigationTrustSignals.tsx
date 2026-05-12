/**
 * InvestigationTrustSignals — Compact trust badges displayed during
 * investigation. Shows governance verified, audit recorded, safety
 * checked, privacy respected status badges.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface Props {
  governancePassed: boolean;
  auditRecorded: boolean;
  safetyChecked: boolean;
  privacyRespected: boolean;
  compact?: boolean;
}

export default function InvestigationTrustSignals({
  governancePassed, auditRecorded, safetyChecked, privacyRespected, compact = false,
}: Props) {
  const badges = [
    { label: "Governance", icon: "fa-shield-check", active: governancePassed, color: theme.colors.health.recovery.DEFAULT },
    { label: "Audited", icon: "fa-clipboard-check", active: auditRecorded, color: theme.colors.accent.primary },
    { label: "Safety", icon: "fa-heart-pulse", active: safetyChecked, color: "#2ed573" },
    { label: "Privacy", icon: "fa-lock", active: privacyRespected, color: "#a29bfe" },
  ];

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        {badges.map((b, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
            title={`${b.label}: ${b.active ? "Verified" : "Pending"}`}
            style={{
              width: 16, height: 16, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: b.active ? `${b.color}15` : "rgba(255,255,255,0.03)",
              border: `1px solid ${b.active ? `${b.color}30` : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <i className={`fas ${b.icon}`} style={{
              fontSize: "0.35rem",
              color: b.active ? b.color : "rgba(255,255,255,0.15)",
            }} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 6, flexWrap: "wrap",
      padding: "6px 0",
    }}>
      {badges.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 5,
            background: b.active ? `${b.color}08` : "rgba(255,255,255,0.02)",
            border: `1px solid ${b.active ? `${b.color}15` : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <i className={`fas ${b.active ? "fa-check" : "fa-circle"}`} style={{
            fontSize: "0.3rem",
            color: b.active ? b.color : "rgba(255,255,255,0.15)",
          }} />
          <span style={{
            fontSize: "0.4rem", fontWeight: 600,
            color: b.active ? `${b.color}` : "rgba(255,255,255,0.2)",
          }}>
            {b.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

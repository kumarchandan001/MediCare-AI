/**
 * MonitoringHeartbeat — Subtle visual presence indicator.
 * Shows the system is continuously aware without being intrusive.
 * Calm, non-surveillance, ambient awareness.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";

export default function MonitoringHeartbeat() {
  const { daysMonitored, healthTrend, wearableContinuity, totalInvestigations } = useTemporalHealth();

  const trendConfig = {
    improving: { color: theme.colors.health.recovery.DEFAULT, label: "Positive trajectory", icon: "fa-arrow-trend-up" },
    stable: { color: theme.colors.accent.primary, label: "Stable monitoring", icon: "fa-equals" },
    declining: { color: theme.colors.health.warning.DEFAULT, label: "Attentive monitoring", icon: "fa-eye" },
    unknown: { color: "rgba(255,255,255,0.35)", label: "Learning your baseline", icon: "fa-seedling" },
  };

  const cfg = trendConfig[healthTrend];
  const hasWearable = wearableContinuity.lastSyncTimestamp > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="lh-heartbeat"
    >
      {/* Pulse indicator */}
      <div className="lh-heartbeat-pulse-wrap">
        <span className="lh-heartbeat-pulse" style={{
          background: cfg.color,
          boxShadow: `0 0 8px ${cfg.color}50`,
        }} />
      </div>

      {/* Status text */}
      <div className="lh-heartbeat-info">
        <span className="lh-heartbeat-label">
          <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, marginRight: 4, fontSize: "0.5rem" }} />
          {cfg.label}
        </span>
        <span className="lh-heartbeat-meta">
          {daysMonitored > 0 ? `${daysMonitored}d monitored` : "Starting today"}
          {totalInvestigations > 0 && ` · ${totalInvestigations} investigation${totalInvestigations > 1 ? "s" : ""}`}
          {hasWearable && " · Wearable synced"}
        </span>
      </div>
    </motion.div>
  );
}

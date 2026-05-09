/**
 * SyncHealthIndicator — Wearable ingestion state visualizer
 * 
 * Shows the health of the data sync pipeline with animated states.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { pulseVariant } from "@/animations";

type SyncState = "syncing" | "synced" | "paused" | "error" | "offline";

interface SyncHealthIndicatorProps {
  state: SyncState;
  dataPointsIngested?: number;
  syncRate?: number;  // points per minute
  compact?: boolean;
}

const syncConfig: Record<SyncState, { color: string; icon: string; label: string; animate: boolean }> = {
  syncing: { color: theme.colors.accent.primary, icon: "fa-rotate", label: "Syncing", animate: true },
  synced: { color: theme.colors.health.recovery.DEFAULT, icon: "fa-circle-check", label: "Synced", animate: false },
  paused: { color: theme.colors.health.warning.DEFAULT, icon: "fa-pause", label: "Paused", animate: false },
  error: { color: theme.colors.health.danger.DEFAULT, icon: "fa-circle-exclamation", label: "Error", animate: false },
  offline: { color: theme.colors.text.subtle, icon: "fa-plug-circle-xmark", label: "Offline", animate: false },
};

export const SyncHealthIndicator = memo(function SyncHealthIndicator({
  state,
  dataPointsIngested,
  syncRate,
  compact = false,
}: SyncHealthIndicatorProps) {
  const config = syncConfig[state];

  return (
    <div className="flex items-center gap-2">
      {/* Animated icon */}
      <motion.div
        variants={config.animate ? pulseVariant : undefined}
        initial="initial"
        animate={config.animate ? "animate" : "initial"}
        className="flex items-center justify-center"
      >
        <i
          className={`fas ${config.icon} ${config.animate ? "animate-spin" : ""}`}
          style={{
            color: config.color,
            fontSize: compact ? "0.6rem" : "0.7rem",
            animationDuration: config.animate ? "2s" : undefined,
          }}
        />
      </motion.div>

      {/* Label */}
      <span
        className="font-bold uppercase tracking-wider"
        style={{ fontSize: "0.55rem", color: config.color }}
      >
        {config.label}
      </span>

      {/* Stats */}
      {!compact && (
        <>
          {dataPointsIngested !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ fontSize: "0.5rem", color: theme.colors.text.subtle, background: theme.colors.surface[3] }}
            >
              {dataPointsIngested.toLocaleString()} pts
            </span>
          )}
          {syncRate !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ fontSize: "0.5rem", color: theme.colors.text.subtle, background: theme.colors.surface[3] }}
            >
              {syncRate}/min
            </span>
          )}
        </>
      )}
    </div>
  );
});

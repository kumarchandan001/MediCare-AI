/**
 * WearableStatusCard — Wearable sync status indicator
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, pulseVariant } from "@/animations";

interface WearableStatusCardProps {
  connected: boolean;
  provider?: string;
  lastSync?: string;
  syncQuality?: "excellent" | "good" | "poor" | "disconnected";
  compact?: boolean;
}

const qualityConfig = {
  excellent: { color: theme.colors.health.recovery.DEFAULT, label: "Excellent" },
  good: { color: theme.colors.accent.primary, label: "Good" },
  poor: { color: theme.colors.health.warning.DEFAULT, label: "Poor" },
  disconnected: { color: theme.colors.text.subtle, label: "Disconnected" },
};

export const WearableStatusCard = memo(function WearableStatusCard({
  connected,
  provider = "Google Fit",
  lastSync,
  syncQuality = "disconnected",
  compact = false,
}: WearableStatusCardProps) {
  const quality = qualityConfig[connected ? syncQuality : "disconnected"];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <motion.div
          variants={connected ? pulseVariant : undefined}
          initial="initial"
          animate={connected ? "animate" : "initial"}
          className="w-2 h-2 rounded-full"
          style={{ background: quality.color }}
        />
        <span style={{ fontSize: "0.65rem", color: quality.color, fontWeight: 600 }}>
          {provider}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="rounded-xl p-3 sm:p-4 flex items-center gap-3"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${quality.color}15` }}
      >
        <i className={`fas fa-watch text-sm`} style={{ color: quality.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
            {provider}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-xs font-bold uppercase"
            style={{
              background: `${quality.color}15`,
              color: quality.color,
              fontSize: "0.55rem",
            }}
          >
            {quality.label}
          </span>
        </div>
        {lastSync && (
          <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
            Last sync: {lastSync}
          </span>
        )}
      </div>

      <motion.div
        variants={connected ? pulseVariant : undefined}
        initial="initial"
        animate={connected ? "animate" : "initial"}
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: quality.color }}
      />
    </motion.div>
  );
});

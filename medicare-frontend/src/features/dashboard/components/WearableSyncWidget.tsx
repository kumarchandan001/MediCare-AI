/**
 * WearableSyncWidget — Dashboard widget showing wearable connection status
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, pulseVariant } from "@/animations";

interface WearableSyncWidgetProps {
  connected?: boolean;
  provider?: string;
  lastSync?: string;
  syncQuality?: "excellent" | "good" | "poor" | "disconnected";
  activeSensors?: string[];
}

const qualityColors = {
  excellent: theme.colors.health.recovery.DEFAULT,
  good: theme.colors.accent.primary,
  poor: theme.colors.health.warning.DEFAULT,
  disconnected: theme.colors.text.subtle,
};

export const WearableSyncWidget = memo(function WearableSyncWidget({
  connected = false,
  provider = "Not connected",
  lastSync,
  syncQuality = "disconnected",
  activeSensors = [],
}: WearableSyncWidgetProps) {
  const color = qualityColors[connected ? syncQuality : "disconnected"];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Status Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <i className="fas fa-watch text-sm" style={{ color }} />
          </div>
          <div>
            <span className="text-sm font-semibold block" style={{ color: theme.colors.text.primary }}>
              {provider}
            </span>
            {lastSync && (
              <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
                Synced {lastSync}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            variants={connected ? pulseVariant : undefined}
            initial="initial"
            animate={connected ? "animate" : "initial"}
            className="w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <span
            className="font-bold uppercase"
            style={{ fontSize: "0.55rem", color, letterSpacing: "0.08em" }}
          >
            {connected ? syncQuality : "Offline"}
          </span>
        </div>
      </div>

      {/* Active Sensors */}
      {connected && activeSensors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeSensors.map((sensor) => (
            <span
              key={sensor}
              className="px-2 py-1 rounded-md text-xs font-medium"
              style={{
                background: theme.colors.surface[3],
                color: theme.colors.text.muted,
                fontSize: "0.6rem",
              }}
            >
              {sensor}
            </span>
          ))}
        </div>
      )}

      {/* Disconnected message */}
      {!connected && (
        <p style={{ fontSize: "0.7rem", color: theme.colors.text.subtle, lineHeight: 1.4 }}>
          Connect a wearable to enable real-time health monitoring and intelligent insights.
        </p>
      )}
    </motion.div>
  );
});

/**
 * ConnectionStatus — Realtime WebSocket connection indicator
 * Shows a compact, animated status pill in the topbar.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useConnectionStatus } from "@/hooks/useWebSocket";
import { pulseVariant } from "@/animations";
import type { WSConnectionStatus } from "@/types/api.types";

const statusConfig: Record<WSConnectionStatus, { color: string; label: string; icon: string }> = {
  connected: { color: theme.colors.health.recovery.DEFAULT, label: "Live", icon: "fa-wifi" },
  connecting: { color: theme.colors.health.warning.DEFAULT, label: "Connecting", icon: "fa-spinner" },
  reconnecting: { color: theme.colors.health.warning.DEFAULT, label: "Reconnecting", icon: "fa-rotate" },
  disconnected: { color: theme.colors.text.subtle, label: "Offline", icon: "fa-wifi" },
  error: { color: theme.colors.health.danger.DEFAULT, label: "Error", icon: "fa-circle-exclamation" },
};

interface ConnectionStatusProps {
  compact?: boolean;
}

export const ConnectionStatus = memo(function ConnectionStatus({ compact = false }: ConnectionStatusProps) {
  const status = useConnectionStatus();
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        variants={status === "connected" ? pulseVariant : undefined}
        initial="initial"
        animate={status === "connected" ? "animate" : "initial"}
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.color }}
      />
      {!compact && (
        <span
          className="font-bold uppercase tracking-wider"
          style={{
            fontSize: "0.55rem",
            color: config.color,
          }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
});

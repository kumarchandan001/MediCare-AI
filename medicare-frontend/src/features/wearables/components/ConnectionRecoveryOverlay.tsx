/**
 * ConnectionRecoveryOverlay — Graceful degradation during network drops
 * 
 * Shows reconnect progress, offline mode, and degraded state indicators.
 * Non-blocking: appears as a compact banner, not a full-screen overlay.
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useConnectionStatus } from "@/hooks/useWebSocket";
import { useRealtimeStore } from "@/store/realtimeStore";
import { fadeInDown } from "@/animations";

export const ConnectionRecoveryOverlay = memo(function ConnectionRecoveryOverlay() {
  const status = useConnectionStatus();
  const reconnectAttempts = useRealtimeStore((s) => s.reconnectAttempts);

  const shouldShow = status === "reconnecting" || status === "disconnected" || status === "error";

  const statusConfig = {
    reconnecting: {
      bg: theme.colors.health.warning.bg,
      border: theme.colors.health.warning.border,
      color: theme.colors.health.warning.DEFAULT,
      icon: "fa-rotate animate-spin",
      title: "Reconnecting…",
      message: `Attempt ${reconnectAttempts}. Live data may be delayed.`,
    },
    disconnected: {
      bg: theme.colors.surface[3],
      border: theme.colors.border[2],
      color: theme.colors.text.subtle,
      icon: "fa-wifi-slash",
      title: "Offline Mode",
      message: "Showing last known data. Reconnecting when possible.",
    },
    error: {
      bg: theme.colors.health.danger.bg,
      border: theme.colors.health.danger.border,
      color: theme.colors.health.danger.DEFAULT,
      icon: "fa-circle-exclamation",
      title: "Connection Error",
      message: "Unable to reach the health intelligence server.",
    },
  } as const;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          variants={fadeInDown}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{
            background: statusConfig[status as keyof typeof statusConfig]?.bg,
            border: `1px solid ${statusConfig[status as keyof typeof statusConfig]?.border}`,
          }}
        >
          <i
            className={`fas ${statusConfig[status as keyof typeof statusConfig]?.icon} text-sm`}
            style={{
              color: statusConfig[status as keyof typeof statusConfig]?.color,
              animationDuration: "1.5s",
            }}
          />
          <div className="flex-1 min-w-0">
            <span
              className="font-semibold text-xs block"
              style={{ color: statusConfig[status as keyof typeof statusConfig]?.color }}
            >
              {statusConfig[status as keyof typeof statusConfig]?.title}
            </span>
            <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted }}>
              {statusConfig[status as keyof typeof statusConfig]?.message}
            </span>
          </div>

          {/* Reconnect progress dots */}
          {status === "reconnecting" && (
            <div className="flex gap-1 shrink-0">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: theme.colors.health.warning.DEFAULT }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

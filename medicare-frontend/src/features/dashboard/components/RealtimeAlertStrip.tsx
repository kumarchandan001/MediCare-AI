/**
 * RealtimeAlertStrip — Streaming alert bar at the top of the dashboard
 * Shows latest critical/warning alerts from WebSocket.
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useStreamingAlerts } from "@/hooks/useWebSocket";
import { fadeInDown } from "@/animations";

export const RealtimeAlertStrip = memo(function RealtimeAlertStrip() {
  const { alerts, dismiss } = useStreamingAlerts();

  // Show only the latest 3 non-info alerts
  const visible = alerts
    .filter((a) => a.severity !== "info")
    .slice(0, 3);

  if (visible.length === 0) return null;

  const severityStyles = {
    warning: {
      bg: theme.colors.health.warning.bg,
      border: theme.colors.health.warning.border,
      color: theme.colors.health.warning.DEFAULT,
      icon: "fa-triangle-exclamation",
    },
    critical: {
      bg: theme.colors.health.danger.bg,
      border: theme.colors.health.danger.border,
      color: theme.colors.health.danger.DEFAULT,
      icon: "fa-circle-exclamation",
    },
    info: {
      bg: theme.colors.health.strain.bg,
      border: theme.colors.health.strain.border,
      color: theme.colors.health.strain.DEFAULT,
      icon: "fa-circle-info",
    },
  };

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visible.map((alert) => {
          const style = severityStyles[alert.severity];
          return (
            <motion.div
              key={alert.id}
              variants={fadeInDown}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              <i className={`fas ${style.icon} text-sm shrink-0`} style={{ color: style.color }} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-xs" style={{ color: style.color }}>
                  {alert.title}
                </span>
                <span className="text-xs ml-2" style={{ color: theme.colors.text.muted }}>
                  {alert.message}
                </span>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                style={{ color: theme.colors.text.subtle }}
              >
                <i className="fas fa-xmark text-xs" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

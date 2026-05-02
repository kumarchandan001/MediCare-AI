import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { AlertsData } from "../types/dashboard.types";

const SEV_CONFIG = {
  low: {
    dot: theme.colors.health.recovery.DEFAULT,
    badge: {
      bg: theme.colors.health.recovery.bg,
      color: theme.colors.health.recovery.DEFAULT,
    },
  },
  medium: {
    dot: theme.colors.health.warning.DEFAULT,
    badge: {
      bg: theme.colors.health.warning.bg,
      color: theme.colors.health.warning.DEFAULT,
    },
  },
  high: {
    dot: theme.colors.health.danger.DEFAULT,
    badge: {
      bg: theme.colors.health.danger.bg,
      color: theme.colors.health.danger.DEFAULT,
    },
  },
  critical: {
    dot: theme.colors.health.danger.DEFAULT,
    badge: {
      bg: theme.colors.health.danger.bg,
      color: theme.colors.health.danger.DEFAULT,
    },
  },
};

interface AlertsListProps {
  data: AlertsData | undefined;
  isLoading: boolean;
}

export function AlertsList({ data, isLoading }: AlertsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: theme.colors.surface[3] }}
          />
        ))}
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="text-center py-8" style={{ color: theme.colors.text.subtle }}>
        <i
          className="fas fa-circle-check text-3xl mb-3 block"
          style={{
            color: theme.colors.health.recovery.DEFAULT,
            opacity: 0.6,
          }}
        />
        <p style={{ fontSize: theme.typography.sizes.sm }}>No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.alerts.map((alert, i) => {
        const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.low;
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:translate-x-0.5"
            style={{
              background: theme.colors.surface[2],
              borderColor: theme.colors.border[1],
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: cfg.dot }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate"
                style={{
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                {alert.title}
              </p>
              {alert.message && (
                <p
                  className="truncate mt-0.5"
                  style={{
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.subtle,
                  }}
                >
                  {alert.message}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{
                  background: cfg.badge.bg,
                  color: cfg.badge.color,
                }}
              >
                {alert.severity}
              </span>
              <span
                style={{
                  fontSize: "0.6rem",
                  color: theme.colors.text.subtle,
                }}
              >
                {alert.time_ago}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { EmergencyAlertItem } from "../types/emergency.types";

interface AlertsListProps {
  alerts: EmergencyAlertItem[];
  count: number;
}

export function AlertsList({ alerts, count }: AlertsListProps) {
  if (count === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.health.danger.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <i className="fas fa-bell text-sm" style={{ color: theme.colors.health.danger.DEFAULT }} />
        <span
          className="font-bold uppercase tracking-widest flex-1"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          Active Health Alerts
        </span>
        <span
          className="px-2 py-0.5 rounded-full font-bold"
          style={{
            fontSize: theme.typography.sizes.xxs,
            background: theme.colors.health.danger.bg,
            color: theme.colors.health.danger.DEFAULT,
          }}
        >
          {count}
        </span>
      </div>

      {/* Alert items */}
      <div className="p-4 space-y-2">
        {alerts.map((alert, i) => {
          const isCritical = alert.severity === "critical";
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{
                background: isCritical ? theme.colors.health.danger.bg : theme.colors.health.warning.bg,
                border: `1px solid ${isCritical ? theme.colors.health.danger.border : theme.colors.health.warning.border}`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{
                  background: isCritical ? theme.colors.health.danger.DEFAULT : theme.colors.health.warning.DEFAULT,
                  animation: isCritical ? "pulse-dot 1s infinite" : undefined,
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold"
                  style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}
                >
                  {alert.title}
                </div>
                {alert.message && (
                  <div
                    style={{
                      fontSize: theme.typography.sizes.xs,
                      color: theme.colors.text.muted,
                      marginTop: "2px",
                      lineHeight: 1.4,
                    }}
                  >
                    {alert.message}
                  </div>
                )}
              </div>
              <span
                className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex-shrink-0"
                style={{
                  fontSize: "0.6rem",
                  background: isCritical ? theme.colors.health.danger.bg : theme.colors.health.warning.bg,
                  color: isCritical ? theme.colors.health.danger.DEFAULT : theme.colors.health.warning.DEFAULT,
                }}
              >
                {alert.severity}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * AlertCard — Health alert display component
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInLeft } from "@/animations";

interface AlertCardProps {
  type: "info" | "warning" | "danger" | "recovery";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  timestamp?: string;
  onDismiss?: () => void;
}

const alertStyles = {
  info: { color: theme.colors.health.strain.DEFAULT, bg: theme.colors.health.strain.bg, border: theme.colors.health.strain.border, icon: "fa-circle-info" },
  warning: { color: theme.colors.health.warning.DEFAULT, bg: theme.colors.health.warning.bg, border: theme.colors.health.warning.border, icon: "fa-triangle-exclamation" },
  danger: { color: theme.colors.health.danger.DEFAULT, bg: theme.colors.health.danger.bg, border: theme.colors.health.danger.border, icon: "fa-circle-exclamation" },
  recovery: { color: theme.colors.health.recovery.DEFAULT, bg: theme.colors.health.recovery.bg, border: theme.colors.health.recovery.border, icon: "fa-heart-pulse" },
};

export const AlertCard = memo(function AlertCard({
  type,
  severity,
  title,
  message,
  timestamp,
  onDismiss,
}: AlertCardProps) {
  const style = alertStyles[type];

  return (
    <motion.div
      variants={fadeInLeft}
      initial="initial"
      animate="animate"
      className="rounded-xl p-3 sm:p-4 flex items-start gap-3"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${style.color}20` }}
      >
        <i className={`fas ${style.icon} text-sm`} style={{ color: style.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm" style={{ color: style.color }}>
            {title}
          </span>
          {severity === "critical" && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold uppercase"
              style={{ background: `${style.color}30`, color: style.color, fontSize: "0.55rem" }}
            >
              Critical
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: theme.colors.text.muted }}>
          {message}
        </p>
        {timestamp && (
          <span className="text-xs mt-1 block" style={{ color: theme.colors.text.subtle, fontSize: "0.65rem" }}>
            {timestamp}
          </span>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ color: theme.colors.text.subtle }}
        >
          <i className="fas fa-xmark text-xs" />
        </button>
      )}
    </motion.div>
  );
});

/**
 * RealtimeMetricCard — Live-updating metric display with pulse indicator
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, pulseVariant } from "@/animations";

interface RealtimeMetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: string;
  isLive?: boolean;
  trend?: "up" | "down" | "stable";
  subtext?: string;
  compact?: boolean;
}

export const RealtimeMetricCard = memo(function RealtimeMetricCard({
  label,
  value,
  unit,
  icon,
  color,
  isLive = false,
  trend,
  subtext,
  compact = false,
}: RealtimeMetricCardProps) {
  const trendIcon =
    trend === "up" ? "fa-arrow-up" : trend === "down" ? "fa-arrow-down" : "fa-minus";
  const trendColor =
    trend === "up"
      ? theme.colors.health.recovery.DEFAULT
      : trend === "down"
      ? theme.colors.health.danger.DEFAULT
      : theme.colors.text.subtle;

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="rounded-xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className={compact ? "p-3" : "p-4 sm:p-5"}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${color}15` }}
            >
              <i className={`fas ${icon} text-xs`} style={{ color }} />
            </div>
            <span
              className="font-semibold uppercase tracking-wider"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              {label}
            </span>
          </div>

          {/* Live Pulse */}
          {isLive && (
            <motion.div
              variants={pulseVariant}
              initial="initial"
              animate="animate"
              className="flex items-center gap-1.5"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: theme.colors.health.recovery.DEFAULT }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  color: theme.colors.health.recovery.DEFAULT,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Live
              </span>
            </motion.div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-black"
            style={{
              fontSize: compact ? "1.5rem" : "clamp(1.5rem, 3vw, 2rem)",
              color: theme.colors.text.primary,
              lineHeight: 1.1,
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span
              className="font-medium"
              style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.muted,
              }}
            >
              {unit}
            </span>
          )}
          {trend && (
            <i
              className={`fas ${trendIcon} text-xs ml-1`}
              style={{ color: trendColor }}
            />
          )}
        </div>

        {/* Subtext */}
        {subtext && (
          <p
            className="mt-1 truncate"
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.subtle,
            }}
          >
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
});

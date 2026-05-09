/**
 * StreamingMetricCards — Throttled metric card grid for constant updates
 * 
 * Each card uses interpolation + throttling to remain calm during
 * high-frequency WebSocket data. Designed for dashboard-level metrics.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { staggerContainer, staggerItem } from "@/animations";

interface StreamingMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  icon: string;
  color: string;
  trend?: "up" | "down" | "stable";
  isLive?: boolean;
}

interface StreamingMetricCardsProps {
  metrics: StreamingMetric[];
  compact?: boolean;
}

// ── Single Card ──────────────────────────────
const StreamCard = memo(function StreamCard({
  metric,
  compact,
}: {
  metric: StreamingMetric;
  compact: boolean;
}) {
  const interpolated = useInterpolatedMetric(metric.value, { duration: 350 });

  const trendIcon =
    metric.trend === "up" ? "fa-caret-up" :
    metric.trend === "down" ? "fa-caret-down" : null;
  const trendColor =
    metric.trend === "up" ? theme.colors.health.recovery.DEFAULT :
    metric.trend === "down" ? theme.colors.health.danger.DEFAULT :
    theme.colors.text.subtle;

  return (
    <motion.div
      variants={staggerItem}
      className={`rounded-xl overflow-hidden ${compact ? "p-3" : "p-4"}`}
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `${metric.color}12` }}
          >
            <i className={`fas ${metric.icon}`} style={{ color: metric.color, fontSize: "0.55rem" }} />
          </div>
          <span className="font-bold uppercase tracking-wider" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
            {metric.label}
          </span>
        </div>
        {metric.isLive && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.colors.health.recovery.DEFAULT }} />
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-black tabular-nums" style={{ fontSize: compact ? "1.2rem" : "1.5rem", color: theme.colors.text.primary, lineHeight: 1 }}>
          {typeof interpolated === "number" ? interpolated.toLocaleString() : interpolated}
        </span>
        {metric.unit && (
          <span className="font-medium" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
            {metric.unit}
          </span>
        )}
        {trendIcon && (
          <i className={`fas ${trendIcon}`} style={{ fontSize: "0.65rem", color: trendColor, marginLeft: "2px" }} />
        )}
      </div>
    </motion.div>
  );
});

// ── Card Grid ────────────────────────────────
export const StreamingMetricCards = memo(function StreamingMetricCards({
  metrics,
  compact = false,
}: StreamingMetricCardsProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`grid gap-3 ${
        compact
          ? "grid-cols-2"
          : metrics.length <= 3
          ? "grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      }`}
    >
      {metrics.map((m) => (
        <StreamCard key={m.key} metric={m} compact={compact} />
      ))}
    </motion.div>
  );
});

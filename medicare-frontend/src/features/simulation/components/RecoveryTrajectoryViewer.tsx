/**
 * RecoveryTrajectoryViewer — Probabilistic recovery outcomes
 *
 * Shows a fan of possible recovery trajectories based on rest choices.
 * Uses Recharts Area stacking to visualize uncertainty bands.
 *
 * SAFETY: Always uses "trajectory suggests" language, never deterministic.
 */
import React, { memo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { theme } from "@/config/theme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion } from "framer-motion";
import { fadeInUp } from "@/animations";

interface TrajectoryPoint {
  time: string;
  optimistic: number;
  expected: number;
  conservative: number;
}

interface RecoveryTrajectoryViewerProps {
  data: TrajectoryPoint[];
  height?: number;
  currentRecovery: number;
  insight?: string;
}

export const RecoveryTrajectoryViewer = memo(function RecoveryTrajectoryViewer({
  data,
  height = 200,
  currentRecovery,
  insight,
}: RecoveryTrajectoryViewerProps) {
  const isMobile = useIsMobile();

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-area" style={{ fontSize: "0.6rem", color: theme.colors.health.recovery.DEFAULT }} />
          <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
            Recovery Trajectory
          </span>
        </div>
        <span className="font-bold text-sm tabular-nums" style={{ color: theme.colors.health.recovery.DEFAULT }}>
          Currently {currentRecovery}%
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0.12} />
                <stop offset="100%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.accent.primary} stopOpacity={0.15} />
                <stop offset="100%" stopColor={theme.colors.accent.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="conGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0.08} />
                <stop offset="100%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border[1]} vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: theme.colors.text.subtle, fontSize: isMobile ? 8 : 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: theme.colors.text.subtle, fontSize: isMobile ? 8 : 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[2]}`,
                borderRadius: "8px",
                fontSize: "0.75rem",
                color: theme.colors.text.primary,
              }}
            />
            {/* Conservative (bottom layer) */}
            <Area type="monotone" dataKey="conservative" name="Conservative" stroke={theme.colors.health.warning.DEFAULT} strokeWidth={1} strokeDasharray="4 4" fill="url(#conGrad)" dot={false} isAnimationActive={false} />
            {/* Expected (middle) */}
            <Area type="monotone" dataKey="expected" name="Expected" stroke={theme.colors.accent.primary} strokeWidth={2} fill="url(#expGrad)" dot={false} isAnimationActive={false} />
            {/* Optimistic (top) */}
            <Area type="monotone" dataKey="optimistic" name="Optimistic" stroke={theme.colors.health.recovery.DEFAULT} strokeWidth={1} strokeDasharray="4 4" fill="url(#optGrad)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {[
          { label: "Optimistic", color: theme.colors.health.recovery.DEFAULT, dashed: true },
          { label: "Expected", color: theme.colors.accent.primary, dashed: false },
          { label: "Conservative", color: theme.colors.health.warning.DEFAULT, dashed: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                background: l.color,
                borderTop: l.dashed ? `1px dashed ${l.color}` : "none",
              }}
            />
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Insight */}
      {insight && (
        <div className="flex items-start gap-2 mt-3">
          <i className="fas fa-circle-info mt-0.5" style={{ color: theme.colors.accent.primary, fontSize: "0.45rem" }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {insight}
          </span>
        </div>
      )}
    </motion.div>
  );
});

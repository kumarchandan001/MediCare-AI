/**
 * StressProjectionGraph — Stress compounding with uncertainty zones
 *
 * Projects the compounding effect of current stress loads with
 * uncertainty visualization. Always paired with mitigation context.
 *
 * SAFETY: Never presents catastrophic projections without actionable steps.
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
  ReferenceLine,
} from "recharts";
import { theme } from "@/config/theme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion } from "framer-motion";
import { fadeInUp } from "@/animations";

interface StressProjectionPoint {
  time: string;
  projected: number;
  mitigated: number;
  uncertaintyHigh: number;
  uncertaintyLow: number;
}

interface StressProjectionGraphProps {
  data: StressProjectionPoint[];
  currentStress: number;
  mitigationStrategy?: string;
  height?: number;
}

export const StressProjectionGraph = memo(function StressProjectionGraph({
  data,
  currentStress,
  mitigationStrategy,
  height = 200,
}: StressProjectionGraphProps) {
  const isMobile = useIsMobile();

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-line" style={{ fontSize: "0.6rem", color: theme.colors.health.warning.DEFAULT }} />
          <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
            Stress Trajectory
          </span>
        </div>
        <span className="font-bold text-sm tabular-nums" style={{ color: theme.colors.health.warning.DEFAULT }}>
          Current: {currentStress}
        </span>
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="stressUncertainty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0.08} />
                <stop offset="100%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mitigatedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0.12} />
                <stop offset="100%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0} />
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
            {/* Caution threshold */}
            <ReferenceLine y={70} stroke={theme.colors.health.danger.DEFAULT} strokeDasharray="4 4" strokeOpacity={0.3} label="" />

            {/* Uncertainty band */}
            <Area type="monotone" dataKey="uncertaintyHigh" name="Upper bound" stroke="none" fill="url(#stressUncertainty)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="uncertaintyLow" name="Lower bound" stroke="none" fill="none" dot={false} isAnimationActive={false} />

            {/* Projected (unmitigated) */}
            <Area type="monotone" dataKey="projected" name="If unchanged" stroke={theme.colors.health.warning.DEFAULT} strokeWidth={2} fill="none" dot={false} isAnimationActive={false} />

            {/* Mitigated path */}
            <Area type="monotone" dataKey="mitigated" name="With intervention" stroke={theme.colors.health.recovery.DEFAULT} strokeWidth={2} strokeDasharray="6 3" fill="url(#mitigatedGrad)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mitigation strategy */}
      {mitigationStrategy && (
        <div
          className="mt-3 p-2.5 rounded-lg flex items-start gap-2"
          style={{ background: `${theme.colors.health.recovery.DEFAULT}06`, border: `1px solid ${theme.colors.health.recovery.DEFAULT}12` }}
        >
          <i className="fas fa-lightbulb mt-0.5" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            <strong style={{ color: theme.colors.text.primary }}>Suggested:</strong> {mitigationStrategy}
          </span>
        </div>
      )}
    </motion.div>
  );
});

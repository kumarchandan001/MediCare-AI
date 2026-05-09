/**
 * ResilienceEvolutionPanel — Tracks resilience growth over time
 *
 * A visual story of how the user's resilience baseline has strengthened,
 * always framed positively and growth-focused.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { fadeInUp } from "@/animations";

interface ResilienceDataPoint {
  period: string;         // e.g. "Week 1", "Mar"
  resilience: number;     // 0–100
  baseline: number;       // trailing avg
}

interface ResilienceEvolutionPanelProps {
  data: ResilienceDataPoint[];
  currentScore: number;
  growthPercent?: number;
  insight?: string;
  height?: number;
}

export const ResilienceEvolutionPanel = memo(function ResilienceEvolutionPanel({
  data,
  currentScore,
  growthPercent,
  insight,
  height = 180,
}: ResilienceEvolutionPanelProps) {
  const isMobile = useIsMobile();

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${theme.colors.health.recovery.DEFAULT}10` }}
          >
            <i className="fas fa-arrow-trend-up" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.6rem" }} />
          </div>
          <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
            Resilience Evolution
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tabular-nums" style={{ color: theme.colors.health.recovery.DEFAULT }}>
            {currentScore}
          </span>
          {growthPercent !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded-full font-bold"
              style={{ fontSize: "0.5rem", background: `${theme.colors.health.recovery.DEFAULT}12`, color: theme.colors.health.recovery.DEFAULT }}
            >
              +{growthPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="resilienceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0.2} />
                <stop offset="100%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border[1]} vertical={false} />
            <XAxis
              dataKey="period"
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
            <Area
              type="monotone"
              dataKey="baseline"
              stroke={theme.colors.text.subtle}
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="resilience"
              stroke={theme.colors.health.recovery.DEFAULT}
              strokeWidth={2}
              fill="url(#resilienceGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      {insight && (
        <div className="flex items-start gap-2 mt-3">
          <i className="fas fa-sparkles mt-0.5" style={{ color: theme.colors.accent.primary, fontSize: "0.45rem" }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {insight}
          </span>
        </div>
      )}
    </motion.div>
  );
});

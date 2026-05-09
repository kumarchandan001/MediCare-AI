/**
 * PhysiologicalDriftGraph — Stress vs Recovery drift over time
 * 
 * Dual-area chart showing the balance between stress accumulation
 * and recovery bandwidth. Calm, readable, touch-friendly.
 */
import React, { memo, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { theme } from "@/config/theme";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface DriftDataPoint {
  time: string;
  stress: number;
  recovery: number;
}

interface PhysiologicalDriftGraphProps {
  data: DriftDataPoint[];
  height?: number;
  maxPoints?: number;
}

export const PhysiologicalDriftGraph = memo(function PhysiologicalDriftGraph({
  data,
  height = 200,
  maxPoints,
}: PhysiologicalDriftGraphProps) {
  const isMobile = useIsMobile();
  const effectiveMax = maxPoints ?? (isMobile ? 15 : 30);
  const visible = useMemo(() => data.slice(-effectiveMax), [data, effectiveMax]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="stressDrift" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0.2} />
              <stop offset="100%" stopColor={theme.colors.health.warning.DEFAULT} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="recoveryDrift" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0.2} />
              <stop offset="100%" stopColor={theme.colors.health.recovery.DEFAULT} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border[1]} vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: theme.colors.text.subtle, fontSize: isMobile ? 8 : 10 }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 3 : 1}
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
              color: theme.colors.text.primary,
              fontSize: "0.75rem",
              padding: "8px 12px",
            }}
          />

          {!isMobile && (
            <Legend
              verticalAlign="top"
              height={24}
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}
            />
          )}

          <Area
            type="monotone"
            dataKey="stress"
            name="Stress"
            stroke={theme.colors.health.warning.DEFAULT}
            strokeWidth={2}
            fill="url(#stressDrift)"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="recovery"
            name="Recovery"
            stroke={theme.colors.health.recovery.DEFAULT}
            strokeWidth={2}
            fill="url(#recoveryDrift)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

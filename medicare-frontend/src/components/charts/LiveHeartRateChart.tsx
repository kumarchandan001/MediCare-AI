/**
 * LiveHeartRateChart — Scrolling Recharts implementation for live HR streams
 * 
 * Auto-scrolls with new data points, adaptive density for mobile,
 * smooth gradient fill, and touch-friendly tooltips.
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
  ReferenceLine,
} from "recharts";
import { theme } from "@/config/theme";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface HRDataPoint {
  time: string;
  bpm: number;
}

interface LiveHeartRateChartProps {
  data: HRDataPoint[];
  height?: number;
  showZones?: boolean;
  maxPoints?: number;
}

const HR_ZONES = {
  resting: { max: 60, color: theme.colors.health.sleep.DEFAULT },
  normal: { max: 100, color: theme.colors.health.recovery.DEFAULT },
  elevated: { max: 140, color: theme.colors.health.warning.DEFAULT },
  high: { max: 200, color: theme.colors.health.danger.DEFAULT },
};

export const LiveHeartRateChart = memo(function LiveHeartRateChart({
  data,
  height = 200,
  showZones = true,
  maxPoints,
}: LiveHeartRateChartProps) {
  const isMobile = useIsMobile();
  const effectiveMax = maxPoints ?? (isMobile ? 20 : 40);
  const visible = useMemo(() => data.slice(-effectiveMax), [data, effectiveMax]);

  const gradientId = "hrGradient";
  const lineColor = "#FF6B8A";

  // Current HR for zone coloring
  const current = visible.length > 0 ? visible[visible.length - 1].bpm : 0;
  const zoneColor =
    current < 60 ? HR_ZONES.resting.color :
    current < 100 ? HR_ZONES.normal.color :
    current < 140 ? HR_ZONES.elevated.color :
    HR_ZONES.high.color;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border[1]} vertical={false} />

          <XAxis
            dataKey="time"
            tick={{ fill: theme.colors.text.subtle, fontSize: isMobile ? 8 : 10 }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 4 : 2}
          />
          <YAxis
            domain={[40, 180]}
            tick={{ fill: theme.colors.text.subtle, fontSize: isMobile ? 8 : 10 }}
            axisLine={false}
            tickLine={false}
          />

          {/* HR Zone reference lines */}
          {showZones && (
            <>
              <ReferenceLine y={60} stroke={HR_ZONES.resting.color} strokeDasharray="4 4" strokeOpacity={0.3} />
              <ReferenceLine y={100} stroke={HR_ZONES.normal.color} strokeDasharray="4 4" strokeOpacity={0.3} />
              <ReferenceLine y={140} stroke={HR_ZONES.elevated.color} strokeDasharray="4 4" strokeOpacity={0.3} />
            </>
          )}

          <Tooltip
            contentStyle={{
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              borderRadius: "8px",
              color: theme.colors.text.primary,
              fontSize: "0.75rem",
              padding: "8px 12px",
              boxShadow: theme.shadows.card,
            }}
            formatter={(value: number) => [`${value} bpm`, "Heart Rate"]}
          />

          <Area
            type="monotone"
            dataKey="bpm"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: theme.colors.bg.primary, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

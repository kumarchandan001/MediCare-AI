/**
 * ResponsiveChart — Recharts wrapper with responsive container & touch tooltips
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

interface ResponsiveChartProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
  areaFill?: boolean;
  gradientId?: string;
}

export const ResponsiveChart = memo(function ResponsiveChart({
  data,
  color = theme.colors.accent.primary,
  height = 200,
  showGrid = true,
  showAxis = true,
  areaFill = true,
  gradientId = "chartGradient",
}: ResponsiveChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.colors.border[1]}
              vertical={false}
            />
          )}

          {showAxis && (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: theme.colors.text.subtle, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: theme.colors.text.subtle, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
            </>
          )}

          <Tooltip
            contentStyle={{
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              borderRadius: theme.radius.md,
              color: theme.colors.text.primary,
              fontSize: "0.75rem",
              padding: "8px 12px",
              boxShadow: theme.shadows.card,
            }}
            cursor={{ stroke: theme.colors.border[2] }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={areaFill ? `url(#${gradientId})` : "none"}
            dot={false}
            activeDot={{
              r: 4,
              fill: color,
              stroke: theme.colors.bg.primary,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

/**
 * MultiLineChart — Multiple metrics overlay
 */
interface MultiLineChartProps {
  data: Record<string, unknown>[];
  lines: { dataKey: string; color: string; label: string }[];
  height?: number;
}

export const MultiLineChart = memo(function MultiLineChart({
  data,
  lines,
  height = 220,
}: MultiLineChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            {lines.map((line) => (
              <linearGradient key={line.dataKey} id={`grad-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={line.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border[1]} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />

          <Tooltip
            contentStyle={{
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              borderRadius: theme.radius.md,
              color: theme.colors.text.primary,
              fontSize: "0.75rem",
              padding: "8px 12px",
            }}
          />

          {lines.map((line) => (
            <Area
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              fill={`url(#grad-${line.dataKey})`}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

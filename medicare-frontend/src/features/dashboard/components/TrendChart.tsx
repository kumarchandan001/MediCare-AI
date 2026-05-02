import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { theme } from "@/config/theme";
import { ChartSkeleton } from "@/shared/components/skeleton/ChartSkeleton";
import type { HealthSummary } from "../types/dashboard.types";

interface TrendChartProps {
  data: HealthSummary | undefined;
  isLoading: boolean;
}

type ChartMetric = "sleep" | "steps" | "hr" | "stress";

const METRICS: Record<
  ChartMetric,
  { label: string; key: keyof Pick<HealthSummary, "sleep_history" | "steps_history" | "hr_history" | "stress_history">; color: string; unit: string }
> = {
  sleep: {
    label: "Sleep",
    key: "sleep_history",
    color: theme.colors.health.sleep.DEFAULT,
    unit: "h",
  },
  steps: {
    label: "Steps",
    key: "steps_history",
    color: theme.colors.health.strain.DEFAULT,
    unit: "",
  },
  hr: {
    label: "Heart Rate",
    key: "hr_history",
    color: theme.colors.health.danger.DEFAULT,
    unit: "bpm",
  },
  stress: {
    label: "Stress",
    key: "stress_history",
    color: theme.colors.health.warning.DEFAULT,
    unit: "/10",
  },
};

export function TrendChart({ data, isLoading }: TrendChartProps) {
  const [metric, setMetric] = useState<ChartMetric>("sleep");

  if (isLoading) return <ChartSkeleton height={200} />;
  if (!data) return null;

  const current = METRICS[metric];
  const historyData = data[current.key] as number[];

  const chartData = data.chart_labels.map((label, i) => ({
    label,
    value: historyData[i] ?? 0,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="px-3 py-2 rounded-xl"
        style={{
          background: theme.colors.surface[4],
          border: `1px solid ${theme.colors.border[2]}`,
        }}
      >
        <p
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.subtle,
          }}
        >
          {label}
        </p>
        <p
          className="font-black"
          style={{
            fontSize: theme.typography.sizes.sm,
            color: current.color,
          }}
        >
          {payload[0].value}
          {current.unit}
        </p>
      </div>
    );
  };

  return (
    <div>
      {/* Metric toggle */}
      <div className="flex items-center justify-between mb-5">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: theme.colors.surface[3],
            border: `1px solid ${theme.colors.border[1]}`,
          }}
        >
          {(Object.keys(METRICS) as ChartMetric[]).map((key) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: metric === key ? current.color : "transparent",
                color:
                  metric === key
                    ? theme.colors.bg.primary
                    : theme.colors.text.subtle,
                fontFamily: theme.typography.fonts.primary,
                boxShadow:
                  metric === key
                    ? `0 0 12px ${current.color}40`
                    : "none",
              }}
            >
              {METRICS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={current.color}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={current.color}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{
              fill: theme.colors.text.subtle,
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fill: theme.colors.text.subtle,
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={current.color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: current.color,
              stroke: "rgba(255,255,255,0.2)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

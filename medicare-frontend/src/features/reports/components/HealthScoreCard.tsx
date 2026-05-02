import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { theme, getScoreColor } from "@/config/theme";
import type { ReportsOverview } from "../types/reports.types";

interface HealthScoreCardProps {
  overview: ReportsOverview | undefined;
  isLoading: boolean;
}

export function HealthScoreCard({ overview, isLoading }: HealthScoreCardProps) {
  const fillRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!fillRef.current || !overview) return;
    const size = 160;
    const stroke = 10;
    const radius = size / 2 - stroke;
    const circ = 2 * Math.PI * radius;
    const pct = overview.overall_score / 100;
    const dash = pct * circ;

    fillRef.current.style.strokeDasharray = `0 ${circ}`;

    const timer = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.transition =
          "stroke-dasharray 1.2s cubic-bezier(0.34,1.2,0.64,1)";
        fillRef.current.style.strokeDasharray = `${dash} ${circ}`;
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [overview]);

  if (isLoading) {
    return (
      <div
        className="h-48 rounded-2xl animate-pulse"
        style={{ background: theme.colors.surface[2] }}
      />
    );
  }
  if (!overview) return null;

  const score = overview.overall_score;
  const color = getScoreColor(score);
  const size = 160;
  const stroke = 10;
  const radius = size / 2 - stroke;
  const circ = 2 * Math.PI * radius;

  const scoreLabel =
    score >= 80
      ? "Excellent"
      : score >= 65
      ? "Good"
      : score >= 50
      ? "Fair"
      : score >= 35
      ? "Below Average"
      : "Needs Attention";

  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center text-center"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <span
        className="font-bold uppercase tracking-widest mb-4"
        style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
      >
        Overall Health Score
      </span>

      {/* Ring */}
      <div className="relative mb-4">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
          overflow="visible"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <circle
            ref={fillRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`0 ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black leading-none"
            style={{
              fontSize: theme.typography.sizes.metricLG,
              color: color,
              letterSpacing: "-0.05em",
              textShadow: `0 0 20px ${color}40`,
            }}
          >
            {score.toFixed(0)}
          </span>
          <span
            className="font-bold uppercase tracking-wider"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            /100
          </span>
        </div>
      </div>

      <div
        className="font-bold uppercase tracking-widest mb-5"
        style={{ fontSize: theme.typography.sizes.xs, color }}
      >
        {scoreLabel}
      </div>

      {/* Best / Worst */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div
          className="p-3 rounded-xl text-center"
          style={{
            background: theme.colors.health.recovery.bg,
            border: `1px solid ${theme.colors.health.recovery.border}`,
          }}
        >
          <i
            className="fas fa-arrow-trend-up text-sm mb-1 block"
            style={{ color: theme.colors.health.recovery.DEFAULT }}
          />
          <div
            className="font-bold uppercase tracking-wider"
            style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
          >
            Best
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.health.recovery.DEFAULT }}
          >
            {overview.best_metric}
          </div>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{
            background: theme.colors.health.warning.bg,
            border: `1px solid ${theme.colors.health.warning.border}`,
          }}
        >
          <i
            className="fas fa-arrow-trend-down text-sm mb-1 block"
            style={{ color: theme.colors.health.warning.DEFAULT }}
          />
          <div
            className="font-bold uppercase tracking-wider"
            style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
          >
            Focus Area
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.health.warning.DEFAULT }}
          >
            {overview.worst_metric}
          </div>
        </div>
      </div>
    </div>
  );
}

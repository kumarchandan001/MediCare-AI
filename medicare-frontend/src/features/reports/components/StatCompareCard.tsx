import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { MetricStat } from "../types/reports.types";

interface StatCompareCardProps {
  stat: MetricStat;
  icon: string;
  color: string;
  index?: number;
}

export function StatCompareCard({ stat, icon, color, index = 0 }: StatCompareCardProps) {
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!numRef.current) return;
    const target = stat.current;
    const isFloat = String(target).includes(".") || stat.unit === "h" || stat.unit === "%";
    const dec = isFloat ? 1 : 0;
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = target * ease;
      if (numRef.current) {
        numRef.current.textContent = val.toFixed(dec);
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [stat.current, stat.unit]);

  const isPositive = stat.trend === "up";
  const isNegative = stat.trend === "down";
  const isStress = stat.label === "Stress";
  const isGood = isStress ? isNegative : isPositive;
  const isBad = isStress ? isPositive : isNegative;

  const trendColor = isGood
    ? theme.colors.health.recovery.DEFAULT
    : isBad
    ? theme.colors.health.danger.DEFAULT
    : theme.colors.text.subtle;

  const trendIcon =
    stat.trend === "up" ? "fa-arrow-up" : stat.trend === "down" ? "fa-arrow-down" : "fa-minus";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Top color line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span
          className="font-bold uppercase tracking-widest"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          {stat.label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <i className={`fas ${icon} text-xs`} style={{ color }} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-3" style={{ letterSpacing: "-0.04em" }}>
        <span
          ref={numRef}
          className="font-black"
          style={{
            fontSize: theme.typography.sizes.metricLG,
            color: theme.colors.text.primary,
            lineHeight: 1,
          }}
        >
          {stat.current.toFixed(stat.unit === "h" || stat.unit === "%" ? 1 : 0)}
        </span>
        {stat.unit && (
          <span style={{ fontSize: "0.9rem", color: theme.colors.text.subtle }}>{stat.unit}</span>
        )}
      </div>

      {/* Trend badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
          style={{
            fontSize: theme.typography.sizes.xxs,
            background: `${trendColor}12`,
            color: trendColor,
          }}
        >
          <i className={`fas ${trendIcon}`} />
          {Math.abs(stat.change_pct).toFixed(1)}%
        </span>
        <span style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
          vs prev period
        </span>
      </div>
    </motion.div>
  );
}

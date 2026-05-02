import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { MetricTrend } from "../types/dashboard.types";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: string;
  trend?: MetricTrend;
  progress?: number;
  index?: number;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  progress = 0,
  index = 0,
}: MetricCardProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  // Animate progress track
  useEffect(() => {
    if (!trackRef.current) return;
    const timer = setTimeout(() => {
      if (trackRef.current) {
        trackRef.current.style.transition =
          "width 0.9s cubic-bezier(0.4,0,0.2,1)";
        trackRef.current.style.width = `${Math.min(progress, 100)}%`;
      }
    }, 400 + index * 80);
    return () => clearTimeout(timer);
  }, [progress, index]);

  // Animate number counter
  useEffect(() => {
    if (!numRef.current) return;
    const target = parseFloat(String(value));
    if (isNaN(target)) return;
    const isFloat = String(value).includes(".");
    const dec = isFloat ? String(value).split(".")[1]?.length || 1 : 0;
    const start = 0;
    const duration = 900;
    const startTime = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const curr = start + (target - start) * ease;
      if (numRef.current) {
        numRef.current.textContent = isFloat
          ? curr.toFixed(dec)
          : String(Math.floor(curr));
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const trendColor =
    trend?.direction === "up"
      ? theme.colors.health.recovery.DEFAULT
      : trend?.direction === "down"
        ? theme.colors.health.danger.DEFAULT
        : theme.colors.text.subtle;

  const trendIcon =
    trend?.direction === "up"
      ? "fa-arrow-up"
      : trend?.direction === "down"
        ? "fa-arrow-down"
        : "fa-minus";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.1 + index * 0.07,
        duration: 0.35,
        ease: [0, 0, 0.2, 1],
      }}
      className="relative rounded-xl p-5 cursor-default overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
      whileHover={{ y: -2, borderColor: theme.colors.border[2] }}
    >
      {/* Top color line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <span
          className="font-bold uppercase tracking-widest"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
          }}
        >
          <i className={`fas ${icon} text-sm`} style={{ color }} />
        </div>
      </div>

      {/* Value */}
      <div
        className="flex items-baseline gap-1 mb-3"
        style={{ letterSpacing: "-0.04em", lineHeight: 1 }}
      >
        <span
          ref={numRef}
          className="font-black"
          style={{
            fontSize: theme.typography.sizes.metricLG,
            color: theme.colors.text.primary,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="font-medium"
            style={{ fontSize: "1rem", color: theme.colors.text.subtle }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Trend badge */}
      {trend && (
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: `${trendColor}12`,
              color: trendColor,
            }}
          >
            <i className={`fas ${trendIcon} text-xs`} />
            {trend.value > 0 ? `${trend.value}%` : "—"}
          </span>
          <span
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            {trend.label}
          </span>
        </div>
      )}

      {/* Progress track */}
      <div
        className="h-0.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          ref={trackRef}
          className="h-full rounded-full"
          style={{
            width: "0%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </motion.div>
  );
}

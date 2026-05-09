/**
 * HealthGauge — Circular SVG gauge for health scores
 * Animated ring fill with responsive sizing.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme, getScoreColor } from "@/config/theme";

interface HealthGaugeProps {
  value: number;
  max?: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export const HealthGauge = memo(function HealthGauge({
  value,
  max = 100,
  label,
  size = 100,
  strokeWidth = 6,
  color,
  showLabel = true,
  animated = true,
}: HealthGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const gaugeColor = color || getScoreColor(value);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.colors.border[2]}
            strokeWidth={strokeWidth}
          />

          {/* Value arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            style={{
              filter: `drop-shadow(0 0 6px ${gaugeColor}40)`,
            }}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black leading-none"
            style={{
              fontSize: size * 0.28,
              color: theme.colors.text.primary,
            }}
          >
            {Math.round(value)}
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className="font-bold uppercase tracking-widest text-center"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
});

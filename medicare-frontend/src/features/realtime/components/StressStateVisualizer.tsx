/**
 * StressStateVisualizer — Animated stress drift gauge
 * 
 * Maps live stress levels to a calm, multi-ring visualizer.
 * Uses interpolation for smooth transitions between stress states.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";

interface StressStateVisualizerProps {
  stressLevel: number;    // 0–100
  stressState?: "calm" | "mild" | "moderate" | "elevated" | "high";
  recoveryBandwidth?: number; // 0–1
  cognitiveLoad?: number;     // 0–1
  lastUpdated?: string | null;
  compact?: boolean;
}

const stressStates = {
  calm: { color: theme.colors.health.recovery.DEFAULT, label: "Calm", icon: "fa-leaf" },
  mild: { color: theme.colors.accent.primary, label: "Mild Stress", icon: "fa-cloud" },
  moderate: { color: theme.colors.health.warning.DEFAULT, label: "Moderate", icon: "fa-cloud-sun" },
  elevated: { color: "#FF8C42", label: "Elevated", icon: "fa-bolt" },
  high: { color: theme.colors.health.danger.DEFAULT, label: "High Stress", icon: "fa-fire" },
};

function getStressState(level: number): keyof typeof stressStates {
  if (level < 20) return "calm";
  if (level < 40) return "mild";
  if (level < 60) return "moderate";
  if (level < 80) return "elevated";
  return "high";
}

export const StressStateVisualizer = memo(function StressStateVisualizer({
  stressLevel,
  stressState,
  recoveryBandwidth,
  cognitiveLoad,
  compact = false,
}: StressStateVisualizerProps) {
  const interpolatedStress = useInterpolatedMetric(stressLevel, { duration: 600 });
  const resolvedState = stressState || getStressState(stressLevel);
  const config = stressStates[resolvedState];

  const size = compact ? 80 : 110;
  const strokeWidth = compact ? 5 : 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const stressOffset = circumference - (interpolatedStress / 100) * circumference;

  // Recovery ring (inner)
  const innerRadius = radius - strokeWidth - 4;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const recoveryOffset = recoveryBandwidth !== undefined
    ? innerCircumference - recoveryBandwidth * innerCircumference
    : innerCircumference;

  return (
    <div className={`flex ${compact ? "flex-row items-center gap-3" : "flex-col items-center gap-3"}`}>
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Outer track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={theme.colors.border[2]} strokeWidth={strokeWidth}
          />
          {/* Stress arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={config.color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: stressOffset }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ filter: `drop-shadow(0 0 4px ${config.color}40)` }}
          />
          {/* Recovery inner ring */}
          {recoveryBandwidth !== undefined && (
            <>
              <circle
                cx={size / 2} cy={size / 2} r={innerRadius}
                fill="none" stroke={theme.colors.surface[4]} strokeWidth={3}
              />
              <motion.circle
                cx={size / 2} cy={size / 2} r={innerRadius}
                fill="none" stroke={theme.colors.health.recovery.DEFAULT} strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={innerCircumference}
                animate={{ strokeDashoffset: recoveryOffset }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                opacity={0.7}
              />
            </>
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <i className={`fas ${config.icon}`} style={{ color: config.color, fontSize: compact ? "0.7rem" : "0.9rem" }} />
          <span
            className="font-black tabular-nums"
            style={{ fontSize: compact ? "1rem" : "1.3rem", color: theme.colors.text.primary, lineHeight: 1.1, marginTop: "2px" }}
          >
            {interpolatedStress}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className={compact ? "" : "text-center"}>
        <span className="font-semibold text-xs block" style={{ color: config.color }}>
          {config.label}
        </span>

        {/* Cognitive load bar */}
        {cognitiveLoad !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>Cognitive</span>
            <div className="w-12 h-1 rounded-full" style={{ background: theme.colors.surface[4] }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(cognitiveLoad * 100)}%`,
                  background: cognitiveLoad > 0.7
                    ? theme.colors.health.warning.DEFAULT
                    : theme.colors.accent.primary,
                }}
              />
            </div>
          </div>
        )}

        {recoveryBandwidth !== undefined && (
          <div className="mt-1 flex items-center gap-1.5">
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>Recovery</span>
            <div className="w-12 h-1 rounded-full" style={{ background: theme.colors.surface[4] }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(recoveryBandwidth * 100)}%`,
                  background: theme.colors.health.recovery.DEFAULT,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

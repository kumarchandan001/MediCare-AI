/**
 * WellnessCapacityMeter — Adaptive wellness capacity visualization
 *
 * A calm, ambient meter showing total available wellness capacity
 * using a segmented arc gauge. Helps users understand when to push
 * and when to rest.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme, getScoreColor } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp } from "@/animations";

interface WellnessCapacityMeterProps {
  capacity: number;              // 0–100
  cognitiveEnergy: number;       // 0–1
  physicalEnergy: number;        // 0–1
  emotionalEnergy: number;       // 0–1
  suggestion?: string;
  compact?: boolean;
}

export const WellnessCapacityMeter = memo(function WellnessCapacityMeter({
  capacity,
  cognitiveEnergy,
  physicalEnergy,
  emotionalEnergy,
  suggestion,
  compact = false,
}: WellnessCapacityMeterProps) {
  const interpCapacity = useInterpolatedMetric(capacity, { duration: 500 });
  const color = getScoreColor(capacity);

  // Arc gauge parameters
  const size = compact ? 120 : 160;
  const strokeWidth = compact ? 8 : 10;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = Math.PI * r; // half circle
  const offset = circumference - (capacity / 100) * circumference;

  const energyBars = [
    { label: "Cognitive", value: cognitiveEnergy, color: "#8B6BFF", icon: "fa-brain" },
    { label: "Physical", value: physicalEnergy, color: theme.colors.health.strain.DEFAULT, icon: "fa-person-running" },
    { label: "Emotional", value: emotionalEnergy, color: "#FF6B8A", icon: "fa-heart" },
  ];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Arc gauge */}
      <div className="flex flex-col items-center mb-3">
        <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={theme.colors.surface[4]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="text-center -mt-4">
          <span className="font-black text-2xl tabular-nums block" style={{ color }}>
            {interpCapacity}
          </span>
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            Wellness Capacity
          </span>
        </div>
      </div>

      {/* Energy breakdown */}
      <div className="space-y-2">
        {energyBars.map((e) => {
          const pct = Math.round(e.value * 100);
          return (
            <div key={e.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <i className={`fas ${e.icon}`} style={{ fontSize: "0.45rem", color: e.color }} />
                  <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{e.label}</span>
                </div>
                <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: e.color }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: theme.colors.surface[4] }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: e.color }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestion */}
      {suggestion && !compact && (
        <div
          className="mt-3 p-2.5 rounded-lg flex items-start gap-2"
          style={{ background: `${color}06`, border: `1px solid ${color}12` }}
        >
          <i className="fas fa-hand-holding-heart mt-0.5" style={{ color, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {suggestion}
          </span>
        </div>
      )}
    </motion.div>
  );
});

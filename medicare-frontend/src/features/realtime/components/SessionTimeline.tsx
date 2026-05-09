/**
 * SessionTimeline — Visual timeline of session phases
 * 
 * Shows session duration segments with intensity and physiological changes.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface SessionPhase {
  label: string;
  duration: number;  // seconds
  intensity: "low" | "moderate" | "high";
  color: string;
}

interface SessionTimelineProps {
  phases: SessionPhase[];
  totalDuration: number; // seconds
  currentPhaseIndex?: number;
}

const intensityOpacity = {
  low: 0.4,
  moderate: 0.7,
  high: 1.0,
};

export const SessionTimeline = memo(function SessionTimeline({
  phases,
  totalDuration,
  currentPhaseIndex,
}: SessionTimelineProps) {
  if (phases.length === 0) return null;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      {/* Timeline bar */}
      <div className="flex rounded-lg overflow-hidden h-3 mb-2" style={{ background: theme.colors.surface[4] }}>
        {phases.map((phase, i) => {
          const width = totalDuration > 0 ? (phase.duration / totalDuration) * 100 : 0;
          const isCurrent = i === currentPhaseIndex;

          return (
            <motion.div
              key={i}
              variants={staggerItem}
              className="h-full relative"
              style={{
                width: `${width}%`,
                background: phase.color,
                opacity: intensityOpacity[phase.intensity],
                borderRight: i < phases.length - 1 ? `1px solid ${theme.colors.surface[1]}` : undefined,
              }}
            >
              {isCurrent && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse"
                  style={{
                    background: "#fff",
                    boxShadow: `0 0 6px ${phase.color}`,
                    transform: "translateX(50%) translateY(-50%)",
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Phase labels */}
      <div className="flex gap-3 flex-wrap">
        {phases.map((phase, i) => {
          const mins = Math.floor(phase.duration / 60);
          const isCurrent = i === currentPhaseIndex;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-sm"
                style={{
                  background: phase.color,
                  opacity: intensityOpacity[phase.intensity],
                }}
              />
              <span
                style={{
                  fontSize: "0.55rem",
                  color: isCurrent ? theme.colors.text.primary : theme.colors.text.subtle,
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {phase.label} ({mins}m)
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

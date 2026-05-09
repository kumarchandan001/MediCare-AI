/**
 * SleepStateChart — Adaptive timeline for sleep stages
 * 
 * Horizontal bar segments showing sleep stage transitions.
 */
import React, { memo } from "react";
import { theme } from "@/config/theme";

interface SleepSegment {
  stage: "awake" | "light" | "deep" | "rem";
  startMin: number;
  durationMin: number;
}

interface SleepStateChartProps {
  segments: SleepSegment[];
  totalMinutes: number;
  height?: number;
}

const stageConfig: Record<string, { color: string; label: string }> = {
  awake: { color: theme.colors.health.warning.DEFAULT, label: "Awake" },
  light: { color: "#6BB8FF", label: "Light" },
  deep: { color: theme.colors.health.sleep.DEFAULT, label: "Deep" },
  rem: { color: "#8B6BFF", label: "REM" },
};

export const SleepStateChart = memo(function SleepStateChart({
  segments,
  totalMinutes,
  height = 40,
}: SleepStateChartProps) {
  if (segments.length === 0 || totalMinutes === 0) {
    return (
      <div className="text-center py-3">
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          No sleep data available
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Timeline bar */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ height, background: theme.colors.surface[4] }}
      >
        {segments.map((seg, i) => {
          const left = (seg.startMin / totalMinutes) * 100;
          const width = (seg.durationMin / totalMinutes) * 100;
          const cfg = stageConfig[seg.stage];

          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 transition-all duration-300"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: cfg.color,
                opacity: seg.stage === "awake" ? 0.5 : 0.75,
                borderRight: `1px solid ${theme.colors.surface[1]}`,
              }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1.5">
        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
          Start
        </span>
        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 flex-wrap">
        {Object.entries(stageConfig).map(([key, cfg]) => {
          const stageMins = segments
            .filter((s) => s.stage === key)
            .reduce((sum, s) => sum + s.durationMin, 0);
          if (stageMins === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: cfg.color }} />
              <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                {cfg.label} ({Math.floor(stageMins / 60)}h{stageMins % 60 > 0 ? ` ${stageMins % 60}m` : ""})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

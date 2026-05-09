/**
 * ConfidenceVisualization — Uncertainty overlay component
 *
 * Reusable component to gracefully visualize prediction confidence
 * and uncertainty zones on any metric or projection.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface ConfidenceVisualizationProps {
  value: number;            // projected value
  confidence: number;       // 0–1
  unit?: string;
  label: string;
  uncertaintyRange?: [number, number]; // [low, high]
  compact?: boolean;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return theme.colors.health.recovery.DEFAULT;
  if (confidence >= 0.5) return theme.colors.accent.primary;
  if (confidence >= 0.3) return theme.colors.health.warning.DEFAULT;
  return theme.colors.text.subtle;
}

export const ConfidenceVisualization = memo(function ConfidenceVisualization({
  value,
  confidence,
  unit = "",
  label,
  uncertaintyRange,
  compact = false,
}: ConfidenceVisualizationProps) {
  const color = getConfidenceColor(confidence);
  const pct = Math.round(confidence * 100);

  return (
    <div
      className={`rounded-xl ${compact ? "p-2.5" : "p-3.5"}`}
      style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Label */}
      <span className="block mb-1" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
        {label}
      </span>

      {/* Value + confidence */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-black text-lg tabular-nums" style={{ color: theme.colors.text.primary }}>
          {value}{unit}
        </span>
        <span
          className="px-1.5 py-0.5 rounded-full font-bold"
          style={{ fontSize: "0.45rem", background: `${color}12`, color }}
        >
          {pct}% confident
        </span>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 rounded-full mb-1" style={{ background: theme.colors.surface[5] }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Uncertainty range */}
      {uncertaintyRange && !compact && (
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
            Range: {uncertaintyRange[0]}{unit} – {uncertaintyRange[1]}{unit}
          </span>
        </div>
      )}
    </div>
  );
});

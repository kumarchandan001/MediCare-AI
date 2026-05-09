/**
 * CognitiveLoadIndicator — Cognitive energy vs bandwidth tracker
 *
 * Visualizes how much cognitive energy is being consumed versus
 * available bandwidth. Helps users understand when to simplify.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp } from "@/animations";

interface CognitiveLoadIndicatorProps {
  currentLoad: number;       // 0–1 (how much is consumed)
  bandwidth: number;         // 0–1 (total available)
  sources?: { label: string; contribution: number }[];  // what's contributing to load
  suggestion?: string;
  compact?: boolean;
}

function getLoadState(load: number): { label: string; color: string } {
  if (load < 0.35) return { label: "Light", color: theme.colors.health.recovery.DEFAULT };
  if (load < 0.6) return { label: "Moderate", color: theme.colors.accent.primary };
  if (load < 0.8) return { label: "Heavy", color: theme.colors.health.warning.DEFAULT };
  return { label: "Overloaded", color: theme.colors.health.danger.DEFAULT };
}

export const CognitiveLoadIndicator = memo(function CognitiveLoadIndicator({
  currentLoad,
  bandwidth,
  sources,
  suggestion,
  compact = false,
}: CognitiveLoadIndicatorProps) {
  const loadPct = Math.round(currentLoad * 100);
  const bwPct = Math.round(bandwidth * 100);
  const interpLoad = useInterpolatedMetric(loadPct, { duration: 400 });
  const state = getLoadState(currentLoad);

  // Usage ratio (load / bandwidth)
  const usageRatio = bandwidth > 0 ? Math.min(currentLoad / bandwidth, 1) : 1;

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${state.color}12` }}
          >
            <i className="fas fa-brain" style={{ color: state.color, fontSize: "0.6rem" }} />
          </div>
          <div>
            <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
              Cognitive Load
            </span>
            <span className="block font-bold" style={{ fontSize: "0.5rem", color: state.color }}>
              {state.label}
            </span>
          </div>
        </div>
        <span className="font-black text-lg tabular-nums" style={{ color: state.color }}>
          {interpLoad}
          <span className="font-medium text-xs" style={{ color: theme.colors.text.subtle }}>%</span>
        </span>
      </div>

      {/* Usage bar (load vs bandwidth) */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            Usage ({loadPct}% of {bwPct}% bandwidth)
          </span>
        </div>
        <div className="h-2.5 rounded-full relative" style={{ background: theme.colors.surface[4] }}>
          {/* Bandwidth limit marker */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${bwPct}%`,
              background: theme.colors.text.subtle,
            }}
          />
          {/* Load fill */}
          <motion.div
            className="h-full rounded-full"
            style={{ background: state.color }}
            animate={{ width: `${usageRatio * bwPct}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Load sources */}
      {sources && sources.length > 0 && !compact && (
        <div className="space-y-1.5 mb-3">
          <span
            className="font-bold uppercase tracking-widest block mb-1"
            style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}
          >
            Load Sources
          </span>
          {sources.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>{s.label}</span>
              <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                {Math.round(s.contribution * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion */}
      {suggestion && !compact && (
        <div className="flex items-start gap-2 mt-2">
          <i className="fas fa-lightbulb mt-0.5" style={{ color: state.color, fontSize: "0.45rem" }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {suggestion}
          </span>
        </div>
      )}
    </motion.div>
  );
});

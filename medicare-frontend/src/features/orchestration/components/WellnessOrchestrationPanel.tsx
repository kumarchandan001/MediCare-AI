/**
 * WellnessOrchestrationPanel — System priorities overview
 *
 * Shows the high-level view of what the wellness engine is currently
 * prioritizing and why. Transparent, collaborative UX.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem, fadeInUp } from "@/animations";

interface Priority {
  id: string;
  label: string;
  icon: string;
  weight: number;       // 0–1 (relative importance)
  color: string;
  reasoning: string;
  active: boolean;
}

interface WellnessOrchestrationPanelProps {
  priorities: Priority[];
  orchestrationMode: string;    // e.g. "Recovery Focus" or "Balanced"
  confidenceLevel: number;      // 0–1
  lastEvaluation?: string;      // timestamp
}

export const WellnessOrchestrationPanel = memo(function WellnessOrchestrationPanel({
  priorities,
  orchestrationMode,
  confidenceLevel,
  lastEvaluation,
}: WellnessOrchestrationPanelProps) {
  const activePriorities = priorities.filter((p) => p.active);
  const maxWeight = Math.max(...activePriorities.map((p) => p.weight), 0.01);

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Mode header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.colors.accent.primary}10` }}
          >
            <i className="fas fa-gauge" style={{ color: theme.colors.accent.primary, fontSize: "0.7rem" }} />
          </div>
          <div>
            <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
              {orchestrationMode}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                Confidence: {Math.round(confidenceLevel * 100)}%
              </span>
              {lastEvaluation && (
                <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                  · {lastEvaluation}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Priority bars */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
        {activePriorities.map((p) => {
          const widthPct = (p.weight / maxWeight) * 100;
          return (
            <motion.div key={p.id} variants={staggerItem}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <i className={`fas ${p.icon}`} style={{ fontSize: "0.5rem", color: p.color }} />
                  <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                    {p.label}
                  </span>
                </div>
                <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: p.color }}>
                  {Math.round(p.weight * 100)}%
                </span>
              </div>

              {/* Weight bar */}
              <div className="h-2 rounded-full mb-1" style={{ background: theme.colors.surface[4] }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: p.color }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>

              {/* Reasoning */}
              <div className="flex items-start gap-1.5">
                <i className="fas fa-circle-info mt-0.5" style={{ fontSize: "0.35rem", color: theme.colors.text.subtle }} />
                <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, lineHeight: 1.35 }}>
                  {p.reasoning}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
});

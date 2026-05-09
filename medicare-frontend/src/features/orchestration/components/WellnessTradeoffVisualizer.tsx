/**
 * WellnessTradeoffVisualizer — Active compromises visualization
 *
 * Shows the wellness tradeoffs the system is managing,
 * e.g. "Reducing activity goals to preserve recovery bandwidth."
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface Tradeoff {
  id: string;
  sacrificed: { label: string; icon: string; color: string };
  preserved: { label: string; icon: string; color: string };
  reasoning: string;
  impact: "minimal" | "moderate" | "significant";
}

interface WellnessTradeoffVisualizerProps {
  tradeoffs: Tradeoff[];
  systemExplanation?: string;
}

const impactColor = {
  minimal: theme.colors.text.subtle,
  moderate: theme.colors.health.warning.DEFAULT,
  significant: theme.colors.health.danger.DEFAULT,
};

export const WellnessTradeoffVisualizer = memo(function WellnessTradeoffVisualizer({
  tradeoffs,
  systemExplanation,
}: WellnessTradeoffVisualizerProps) {
  if (tradeoffs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3">
        <i className="fas fa-scale-balanced text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          All wellness systems are in harmony — no active tradeoffs.
        </span>
      </div>
    );
  }

  return (
    <div>
      {systemExplanation && (
        <div className="flex items-start gap-2 mb-3">
          <i className="fas fa-circle-info mt-0.5" style={{ fontSize: "0.45rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {systemExplanation}
          </span>
        </div>
      )}

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
        {tradeoffs.map((t) => (
          <motion.div
            key={t.id}
            variants={staggerItem}
            className="rounded-xl p-3"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            {/* Sacrificed → Preserved flow */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${t.sacrificed.color}08` }}>
                <i className={`fas ${t.sacrificed.icon}`} style={{ fontSize: "0.45rem", color: t.sacrificed.color }} />
                <span style={{ fontSize: "0.55rem", color: t.sacrificed.color }}>{t.sacrificed.label}</span>
              </div>
              <i className="fas fa-arrow-right" style={{ fontSize: "0.35rem", color: theme.colors.text.subtle }} />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${t.preserved.color}08` }}>
                <i className={`fas ${t.preserved.icon}`} style={{ fontSize: "0.45rem", color: t.preserved.color }} />
                <span style={{ fontSize: "0.55rem", color: t.preserved.color }}>{t.preserved.label}</span>
              </div>
              <span
                className="ml-auto px-1.5 py-0.5 rounded font-bold"
                style={{ fontSize: "0.4rem", background: `${impactColor[t.impact]}10`, color: impactColor[t.impact] }}
              >
                {t.impact}
              </span>
            </div>

            {/* Reasoning */}
            <div className="flex items-start gap-1.5">
              <i className="fas fa-lightbulb mt-0.5" style={{ fontSize: "0.35rem", color: theme.colors.text.subtle }} />
              <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, lineHeight: 1.35 }}>
                {t.reasoning}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

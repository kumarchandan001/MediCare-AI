/**
 * AdaptiveLifestyleInsights — Stable habit formation insights
 *
 * Highlights habits that have solidified into consistent patterns,
 * using motivating, reflective language.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface LifestyleInsight {
  id: string;
  habitName: string;
  status: "forming" | "stabilized" | "thriving";
  consistency: number;     // 0–100
  description: string;
  since?: string;          // e.g. "Consistent since April 22"
}

interface AdaptiveLifestyleInsightsProps {
  insights: LifestyleInsight[];
}

const statusConfig = {
  forming: { color: theme.colors.health.strain.DEFAULT, label: "Forming", icon: "fa-seedling" },
  stabilized: { color: theme.colors.accent.primary, label: "Stabilized", icon: "fa-circle-check" },
  thriving: { color: theme.colors.health.recovery.DEFAULT, label: "Thriving", icon: "fa-star" },
};

export const AdaptiveLifestyleInsights = memo(function AdaptiveLifestyleInsights({
  insights,
}: AdaptiveLifestyleInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-leaf text-sm mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          Lifestyle patterns are still forming — we'll share insights as they emerge.
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
      {insights.map((ins) => {
        const cfg = statusConfig[ins.status];
        return (
          <motion.div
            key={ins.id}
            variants={staggerItem}
            className="rounded-xl p-3.5"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${cfg.color}10` }}
              >
                <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "0.55rem" }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                    {ins.habitName}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full font-bold"
                    style={{ fontSize: "0.45rem", background: `${cfg.color}12`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
                  {ins.description}
                </p>

                {/* Consistency bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: theme.colors.surface[5] }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cfg.color }}
                      animate={{ width: `${ins.consistency}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <span className="font-bold tabular-nums shrink-0" style={{ fontSize: "0.5rem", color: cfg.color }}>
                    {ins.consistency}%
                  </span>
                </div>

                {ins.since && (
                  <span className="block mt-1.5" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                    {ins.since}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

/**
 * ResilienceGrowthHighlights — Long-term positive adaptation highlights
 *
 * Focuses on how the user's baseline has strengthened over weeks/months.
 * Language is always celebratory and growth-focused.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface ResilienceHighlight {
  id: string;
  title: string;
  description: string;
  timeframe: string;       // e.g. "Over the past 3 weeks"
  growthPercent?: number;
  icon: string;
  color: string;
}

interface ResilienceGrowthHighlightsProps {
  highlights: ResilienceHighlight[];
  overallGrowth?: string;   // e.g. "Your resilience has grown 18% this month"
}

export const ResilienceGrowthHighlights = memo(function ResilienceGrowthHighlights({
  highlights,
  overallGrowth,
}: ResilienceGrowthHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4">
        <i className="fas fa-seedling text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
        <span style={{ fontSize: "0.7rem", color: theme.colors.text.subtle }}>
          Your resilience story is just beginning — keep going.
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Overall growth statement */}
      {overallGrowth && (
        <div
          className="rounded-xl p-3.5 mb-3 flex items-center gap-2.5"
          style={{ background: `${theme.colors.health.recovery.DEFAULT}06`, border: `1px solid ${theme.colors.health.recovery.DEFAULT}12` }}
        >
          <i className="fas fa-trophy" style={{ color: "#FFB86B", fontSize: "0.7rem" }} />
          <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
            {overallGrowth}
          </span>
        </div>
      )}

      {/* Highlights */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
        {highlights.map((h) => (
          <motion.div
            key={h.id}
            variants={staggerItem}
            className="rounded-xl p-3.5 flex items-start gap-3"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${h.color}10` }}
            >
              <i className={`fas ${h.icon}`} style={{ color: h.color, fontSize: "0.6rem" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                  {h.title}
                </span>
                {h.growthPercent !== undefined && (
                  <span
                    className="px-1.5 py-0.5 rounded-full font-bold"
                    style={{ fontSize: "0.5rem", background: `${h.color}12`, color: h.color }}
                  >
                    +{h.growthPercent}%
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.45 }}>
                {h.description}
              </p>
              <span className="block mt-1" style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                {h.timeframe}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

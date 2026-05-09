/**
 * WeeklyReflectionCard — Thoughtful prose-driven weekly wellness summary
 *
 * A calm, reflective card that narrates what the past week felt like
 * using supportive, emotionally intelligent language.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, staggerContainer, staggerItem } from "@/animations";

interface WeekHighlight {
  icon: string;
  label: string;
  value: string;
  color: string;
  change?: string;
}

interface WeeklyReflectionCardProps {
  weekLabel: string;            // e.g. "May 5 – May 11"
  narrative: string;            // human-centric prose summary
  highlights: WeekHighlight[];
  moodTrend?: "improving" | "stable" | "declining";
  overallScore?: number;        // 0–100
  encouragement?: string;       // supportive closing message
}

const moodConfig = {
  improving: { icon: "fa-arrow-trend-up", color: theme.colors.health.recovery.DEFAULT, label: "Improving" },
  stable: { icon: "fa-minus", color: theme.colors.accent.primary, label: "Steady" },
  declining: { icon: "fa-arrow-trend-down", color: theme.colors.health.warning.DEFAULT, label: "Needs attention" },
};

export const WeeklyReflectionCard = memo(function WeeklyReflectionCard({
  weekLabel,
  narrative,
  highlights,
  moodTrend = "stable",
  overallScore,
  encouragement,
}: WeeklyReflectionCardProps) {
  const mood = moodConfig[moodTrend];

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.colors.accent.primary}10` }}
          >
            <i className="fas fa-book-open" style={{ color: theme.colors.accent.primary, fontSize: "0.7rem" }} />
          </div>
          <div>
            <span className="font-semibold text-sm block" style={{ color: theme.colors.text.primary }}>
              Weekly Reflection
            </span>
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
              {weekLabel}
            </span>
          </div>
        </div>

        {/* Mood trend badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: `${mood.color}10`, border: `1px solid ${mood.color}20` }}
        >
          <i className={`fas ${mood.icon}`} style={{ fontSize: "0.5rem", color: mood.color }} />
          <span className="font-semibold" style={{ fontSize: "0.55rem", color: mood.color }}>
            {mood.label}
          </span>
        </div>
      </div>

      {/* Narrative */}
      <p
        className="leading-relaxed mb-4"
        style={{ fontSize: "0.8rem", color: theme.colors.text.muted, lineHeight: 1.65 }}
      >
        {narrative}
      </p>

      {/* Highlights grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4"
      >
        {highlights.map((h) => (
          <motion.div
            key={h.label}
            variants={staggerItem}
            className="rounded-xl p-3 text-center"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <i className={`fas ${h.icon} mb-1.5 block`} style={{ color: h.color, fontSize: "0.65rem" }} />
            <span className="font-black text-base block tabular-nums" style={{ color: theme.colors.text.primary }}>
              {h.value}
            </span>
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>{h.label}</span>
            {h.change && (
              <span className="block mt-0.5" style={{ fontSize: "0.5rem", color: h.color }}>
                {h.change}
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Encouragement */}
      {encouragement && (
        <div
          className="rounded-xl p-3.5 flex items-start gap-2.5"
          style={{ background: `${theme.colors.health.recovery.DEFAULT}06`, border: `1px solid ${theme.colors.health.recovery.DEFAULT}12` }}
        >
          <i className="fas fa-hand-holding-heart mt-0.5" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.6rem" }} />
          <span style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.5 }}>
            {encouragement}
          </span>
        </div>
      )}
    </motion.div>
  );
});

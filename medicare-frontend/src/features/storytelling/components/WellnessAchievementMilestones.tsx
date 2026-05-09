/**
 * WellnessAchievementMilestones — Sustainable achievements
 *
 * Celebrates sustainable balance rather than gamified streaks.
 * Focuses on resilience, recovery, and healthy pacing.
 *
 * SAFETY: Avoids perfection pressure and addictive streak systems.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "resilience" | "recovery" | "balance" | "growth" | "mindfulness";
  earnedDate: string;
  icon: string;
  isNew?: boolean;
}

interface WellnessAchievementMilestonesProps {
  achievements: Achievement[];
  encouragement?: string;
}

const categoryColor: Record<string, string> = {
  resilience: theme.colors.health.recovery.DEFAULT,
  recovery: "#8B6BFF",
  balance: theme.colors.accent.primary,
  growth: "#FFB86B",
  mindfulness: theme.colors.health.sleep.DEFAULT,
};

export const WellnessAchievementMilestones = memo(function WellnessAchievementMilestones({
  achievements,
  encouragement,
}: WellnessAchievementMilestonesProps) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-seedling text-sm mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.7rem", color: theme.colors.text.subtle }}>
          Achievements grow from consistent, healthy choices — not perfection.
        </span>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {achievements.map((a) => {
          const color = categoryColor[a.category] || theme.colors.accent.primary;
          return (
            <motion.div
              key={a.id}
              variants={staggerItem}
              className="rounded-xl p-3.5 flex items-start gap-3 relative"
              style={{
                background: a.isNew ? `${color}06` : theme.colors.surface[3],
                border: `1px solid ${a.isNew ? `${color}15` : theme.colors.border[1]}`,
              }}
            >
              {/* New badge */}
              {a.isNew && (
                <span
                  className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full font-bold"
                  style={{ fontSize: "0.4rem", background: `${color}15`, color }}
                >
                  New
                </span>
              )}

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}10`, border: `1px solid ${color}15` }}
              >
                <i className={`fas ${a.icon}`} style={{ color, fontSize: "0.8rem" }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-xs block mb-0.5" style={{ color: theme.colors.text.primary }}>
                  {a.title}
                </span>
                <p style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
                  {a.description}
                </p>
                <span className="block mt-1" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                  {a.earnedDate}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Encouragement footer */}
      {encouragement && (
        <div className="mt-3 flex items-start gap-2">
          <i className="fas fa-hand-holding-heart mt-0.5" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, lineHeight: 1.4 }}>
            {encouragement}
          </span>
        </div>
      )}
    </div>
  );
});

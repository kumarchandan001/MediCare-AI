import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";
import type { HabitsData } from "../types/dashboard.types";

const PRIORITY_COLORS: Record<string, string> = {
  high: theme.colors.health.danger.DEFAULT,
  medium: theme.colors.health.warning.DEFAULT,
  low: theme.colors.health.recovery.DEFAULT,
};

interface HabitCardsProps {
  data: HabitsData | undefined;
  isLoading: boolean;
}

export function HabitCards({ data, isLoading }: HabitCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data || data.count === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {data.tips.map((tip, i) => {
        const pColor = PRIORITY_COLORS[tip.priority] || theme.colors.text.subtle;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative rounded-xl p-5 overflow-hidden"
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${theme.colors.border[1]}`,
            }}
          >
            {/* Left priority stripe */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{
                background: pColor,
                boxShadow: `0 0 8px ${pColor}`,
              }}
            />

            <div className="pl-3">
              {/* Category badge */}
              <span
                className="inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2"
                style={{
                  fontSize: "0.6rem",
                  background: theme.colors.accent.subtle,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.accent.border}`,
                }}
              >
                {tip.category}
              </span>

              {/* Icon + title */}
              <div className="flex items-start gap-2 mb-2">
                <i
                  className={`fas ${tip.icon} text-sm flex-shrink-0 mt-0.5`}
                  style={{ color: pColor }}
                />
                <h4
                  className="font-semibold leading-snug"
                  style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.primary,
                  }}
                >
                  {tip.title}
                </h4>
              </div>

              {/* Tip */}
              <p
                className="leading-relaxed mb-2"
                style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.muted,
                }}
              >
                {tip.tip}
              </p>

              {/* Reason */}
              <p
                className="italic"
                style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.subtle,
                }}
              >
                {tip.reason}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

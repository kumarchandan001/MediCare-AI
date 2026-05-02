import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { CardSkeleton } from "@/shared/components/skeleton/CardSkeleton";
import type { InsightsData } from "../types/dashboard.types";

const TYPE_CONFIG = {
  good: {
    bg: theme.colors.health.recovery.bg,
    border: theme.colors.health.recovery.border,
    dot: theme.colors.health.recovery.DEFAULT,
  },
  warning: {
    bg: theme.colors.health.warning.bg,
    border: theme.colors.health.warning.border,
    dot: theme.colors.health.warning.DEFAULT,
  },
  danger: {
    bg: theme.colors.health.danger.bg,
    border: theme.colors.health.danger.border,
    dot: theme.colors.health.danger.DEFAULT,
  },
  info: {
    bg: theme.colors.health.strain.bg,
    border: theme.colors.health.strain.border,
    dot: theme.colors.health.strain.DEFAULT,
  },
};

interface InsightsListProps {
  data: InsightsData | undefined;
  isLoading: boolean;
}

export function InsightsList({ data, isLoading }: InsightsListProps) {
  if (isLoading) return <CardSkeleton />;

  if (!data || data.count === 0) {
    return (
      <div className="text-center py-8" style={{ color: theme.colors.text.subtle }}>
        <i
          className="fas fa-brain text-3xl mb-3 block"
          style={{ opacity: 0.3 }}
        />
        <p style={{ fontSize: theme.typography.sizes.sm }}>
          Log health data to see AI insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.insights.map((insight, i) => {
        const cfg = TYPE_CONFIG[insight.type];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 p-4 rounded-xl border transition-transform hover:translate-x-1"
            style={{
              background: cfg.bg,
              borderColor: cfg.border,
            }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ background: cfg.dot }}
            />
            <p
              style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.muted,
                lineHeight: 1.6,
              }}
            >
              {insight.message}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

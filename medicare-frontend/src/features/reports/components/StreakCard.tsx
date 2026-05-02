import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { ReportStats } from "../types/reports.types";

interface StreakCardProps {
  stats: ReportStats | undefined;
  isLoading: boolean;
}

export function StreakCard({ stats, isLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <div
        className="h-32 rounded-2xl animate-pulse"
        style={{ background: theme.colors.surface[2] }}
      />
    );
  }
  if (!stats) return null;

  const { streaks } = stats;

  const STREAK_ITEMS = [
    {
      label: "Current Streak",
      value: streaks.current_streak,
      unit: "days",
      icon: "fa-fire",
      color:
        streaks.current_streak >= 7
          ? theme.colors.health.recovery.DEFAULT
          : streaks.current_streak >= 3
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.accent.primary,
    },
    {
      label: "Longest Streak",
      value: streaks.longest_streak,
      unit: "days",
      icon: "fa-trophy",
      color: theme.colors.health.warning.DEFAULT,
    },
    {
      label: "This Week",
      value: streaks.this_week,
      unit: "/ 7 days",
      icon: "fa-calendar-week",
      color: theme.colors.accent.primary,
    },
    {
      label: "This Month",
      value: streaks.this_month,
      unit: "/ 30 days",
      icon: "fa-calendar",
      color: theme.colors.health.sleep.DEFAULT,
    },
    {
      label: "Total Logged",
      value: streaks.total_logged,
      unit: "days",
      icon: "fa-database",
      color: theme.colors.health.strain.DEFAULT,
    },
    {
      label: "Vitals Records",
      value: stats.total_vitals,
      unit: "entries",
      icon: "fa-heart-pulse",
      color: theme.colors.health.danger.DEFAULT,
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: theme.colors.accent.primary }}
          />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            Consistency & Streaks
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px" style={{ background: theme.colors.border[1] }}>
        {STREAK_ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex flex-col items-center text-center p-5"
            style={{ background: theme.colors.surface[2] }}
          >
            <i className={`fas ${item.icon} text-xl mb-3`} style={{ color: item.color }} />
            <div
              className="font-black leading-none mb-1"
              style={{
                fontSize: theme.typography.sizes.h1,
                color: item.color,
                letterSpacing: "-0.04em",
              }}
            >
              {item.value}
            </div>
            <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
              {item.unit}
            </div>
            <div
              className="font-bold uppercase tracking-wider mt-1"
              style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
            >
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

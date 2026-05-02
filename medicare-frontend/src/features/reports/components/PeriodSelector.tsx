import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { ReportPeriod } from "../types/reports.types";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
];

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div
      className="flex gap-1 p-1.5 rounded-xl"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {PERIODS.map((p) => {
        const isActive = p.value === value;
        return (
          <motion.button
            key={p.value}
            onClick={() => onChange(p.value)}
            className="px-5 py-2 rounded-xl font-bold uppercase tracking-wider transition-colors relative"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: isActive ? theme.colors.accent.primary : "transparent",
              color: isActive ? theme.colors.bg.primary : theme.colors.text.subtle,
              boxShadow: isActive ? theme.shadows.accent : "none",
            }}
            whileTap={{ scale: 0.96 }}
          >
            {p.label}
          </motion.button>
        );
      })}
    </div>
  );
}

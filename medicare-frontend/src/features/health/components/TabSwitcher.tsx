import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { HealthTab } from "../types/health.types";

interface Tab {
  key: HealthTab;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: "vitals", label: "Vitals", icon: "fa-heart-pulse" },
  { key: "activity", label: "Activity", icon: "fa-person-running" },
  { key: "bmi", label: "BMI", icon: "fa-weight-scale" },
  { key: "medications", label: "Medications", icon: "fa-pills" },
  { key: "history", label: "History", icon: "fa-clock-rotate-left" },
];

interface TabSwitcherProps {
  active: HealthTab;
  onChange: (tab: HealthTab) => void;
}

export function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  return (
    <div
      className="flex gap-1 p-1.5 rounded-2xl overflow-x-auto mb-6"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
        scrollbarWidth: "none",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <motion.button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-shrink-0 font-bold uppercase tracking-wider transition-colors relative"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: isActive ? theme.colors.accent.primary : "transparent",
              color: isActive ? theme.colors.bg.primary : theme.colors.text.subtle,
              boxShadow: isActive ? theme.shadows.accent : "none",
            }}
            whileTap={{ scale: 0.97 }}
          >
            <i className={`fas ${tab.icon}`} />
            {tab.label}
          </motion.button>
        );
      })}
    </div>
  );
}

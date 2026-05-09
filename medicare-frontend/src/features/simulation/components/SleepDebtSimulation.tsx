/**
 * SleepDebtSimulation — Sleep debt impact visualization
 *
 * Shows how accumulated sleep debt may affect cognitive and
 * physiological function. Framed supportively with rest recommendations.
 *
 * SAFETY: Uses "may influence" rather than "will cause" language.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp, staggerContainer, staggerItem } from "@/animations";

interface SleepDebtImpact {
  area: string;
  icon: string;
  currentImpact: number;   // 0–100 severity
  color: string;
  description: string;
}

interface SleepDebtSimulationProps {
  debtHours: number;
  debtTrend: "accumulating" | "stable" | "reducing";
  impacts: SleepDebtImpact[];
  recoveryEstimate?: string;   // e.g. "~2 nights of 8hr rest"
  encouragement?: string;
}

const trendConfig = {
  accumulating: { icon: "fa-arrow-up", color: theme.colors.health.warning.DEFAULT, label: "Accumulating" },
  stable: { icon: "fa-minus", color: theme.colors.text.subtle, label: "Stable" },
  reducing: { icon: "fa-arrow-down", color: theme.colors.health.recovery.DEFAULT, label: "Reducing" },
};

export const SleepDebtSimulation = memo(function SleepDebtSimulation({
  debtHours,
  debtTrend,
  impacts,
  recoveryEstimate,
  encouragement,
}: SleepDebtSimulationProps) {
  const interpDebt = useInterpolatedMetric(Math.round(debtHours * 10), { duration: 400 });
  const trend = trendConfig[debtTrend];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.colors.health.sleep.DEFAULT}10` }}
          >
            <i className="fas fa-moon" style={{ color: theme.colors.health.sleep.DEFAULT, fontSize: "0.7rem" }} />
          </div>
          <div>
            <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
              Sleep Debt
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <i className={`fas ${trend.icon}`} style={{ fontSize: "0.4rem", color: trend.color }} />
              <span style={{ fontSize: "0.5rem", color: trend.color }}>{trend.label}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-black text-2xl tabular-nums" style={{ color: theme.colors.health.sleep.DEFAULT }}>
            {(interpDebt / 10).toFixed(1)}
          </span>
          <span className="text-xs ml-1" style={{ color: theme.colors.text.subtle }}>hours</span>
        </div>
      </div>

      {/* Impact areas */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2 mb-3">
        {impacts.map((imp) => (
          <motion.div key={imp.area} variants={staggerItem}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <i className={`fas ${imp.icon}`} style={{ fontSize: "0.45rem", color: imp.color }} />
                <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>{imp.area}</span>
              </div>
              <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: imp.color }}>
                {imp.currentImpact}%
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: theme.colors.surface[4] }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: imp.color }}
                animate={{ width: `${imp.currentImpact}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span className="block mt-0.5" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
              {imp.description}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Recovery estimate */}
      {recoveryEstimate && (
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-clock" style={{ fontSize: "0.45rem", color: theme.colors.health.sleep.DEFAULT }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>
            Recovery estimate: {recoveryEstimate}
          </span>
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <div
          className="p-2.5 rounded-lg flex items-start gap-2"
          style={{ background: `${theme.colors.health.sleep.DEFAULT}06`, border: `1px solid ${theme.colors.health.sleep.DEFAULT}12` }}
        >
          <i className="fas fa-hand-holding-heart mt-0.5" style={{ color: theme.colors.health.sleep.DEFAULT, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {encouragement}
          </span>
        </div>
      )}
    </motion.div>
  );
});

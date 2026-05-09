/**
 * RecoveryReflectionSummary — Celebrates effective recovery periods
 *
 * Shows how the user's body responded to rest strategies,
 * framed with supportive, celebratory language.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";

interface RecoveryPeriod {
  label: string;           // e.g. "Tuesday evening rest"
  recoveryGain: number;    // percentage gained
  strategy: string;        // what worked
}

interface RecoveryReflectionSummaryProps {
  totalRecoveryScore: number;   // 0–100
  trend: "improving" | "stable" | "needs_attention";
  periods: RecoveryPeriod[];
  insight?: string;
}

const trendStyle = {
  improving: { icon: "fa-arrow-up", color: theme.colors.health.recovery.DEFAULT, label: "Recovery improving" },
  stable: { icon: "fa-equals", color: theme.colors.accent.primary, label: "Recovery steady" },
  needs_attention: { icon: "fa-circle-info", color: theme.colors.health.warning.DEFAULT, label: "Recovery needs care" },
};

export const RecoveryReflectionSummary = memo(function RecoveryReflectionSummary({
  totalRecoveryScore,
  trend,
  periods,
  insight,
}: RecoveryReflectionSummaryProps) {
  const interpScore = useInterpolatedMetric(totalRecoveryScore, { duration: 600 });
  const ts = trendStyle[trend];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Score header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.colors.health.recovery.DEFAULT}10` }}
          >
            <i className="fas fa-heart-circle-check" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.7rem" }} />
          </div>
          <div>
            <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
              Recovery Reflection
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <i className={`fas ${ts.icon}`} style={{ fontSize: "0.45rem", color: ts.color }} />
              <span style={{ fontSize: "0.55rem", color: ts.color }}>{ts.label}</span>
            </div>
          </div>
        </div>

        <span className="font-black text-2xl tabular-nums" style={{ color: theme.colors.health.recovery.DEFAULT }}>
          {interpScore}
          <span className="font-medium text-xs ml-0.5" style={{ color: theme.colors.text.subtle }}>%</span>
        </span>
      </div>

      {/* Recovery periods */}
      <div className="space-y-2 mb-3">
        {periods.map((p, i) => (
          <div
            key={i}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${theme.colors.health.recovery.DEFAULT}12` }}
            >
              <i className="fas fa-leaf" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.5rem" }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs block" style={{ color: theme.colors.text.primary }}>
                {p.label}
              </span>
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
                {p.strategy}
              </span>
            </div>
            <span className="font-bold text-xs tabular-nums shrink-0" style={{ color: theme.colors.health.recovery.DEFAULT }}>
              +{p.recoveryGain}%
            </span>
          </div>
        ))}
      </div>

      {/* Insight */}
      {insight && (
        <div className="flex items-start gap-2 mt-2">
          <i className="fas fa-sparkles mt-0.5" style={{ color: theme.colors.accent.primary, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {insight}
          </span>
        </div>
      )}
    </motion.div>
  );
});

/**
 * BurnoutRiskIndicators — Calm orchestration warning component
 * 
 * Visualizes burnout/overload risk from the wellness orchestration engine
 * using a calm, supportive aesthetic.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp } from "@/animations";

interface BurnoutRiskIndicatorsProps {
  interventionFatigue: number;  // 0–1
  cognitiveOverload: number;    // 0–1
  emotionalStrain: number;      // 0–1
  overallBurnoutRisk: number;   // 0–100
  suggestion?: string;
  compact?: boolean;
}

function getRiskLevel(value: number): { label: string; color: string } {
  if (value < 30) return { label: "Low", color: theme.colors.health.recovery.DEFAULT };
  if (value < 60) return { label: "Moderate", color: theme.colors.health.warning.DEFAULT };
  if (value < 80) return { label: "High", color: "#FF8C42" };
  return { label: "Critical", color: theme.colors.health.danger.DEFAULT };
}

export const BurnoutRiskIndicators = memo(function BurnoutRiskIndicators({
  interventionFatigue,
  cognitiveOverload,
  emotionalStrain,
  overallBurnoutRisk,
  suggestion,
  compact = false,
}: BurnoutRiskIndicatorsProps) {
  const interpRisk = useInterpolatedMetric(overallBurnoutRisk, { duration: 500 });
  const risk = getRiskLevel(overallBurnoutRisk);

  const indicators = [
    { label: "Intervention Fatigue", value: interventionFatigue, icon: "fa-bell-slash" },
    { label: "Cognitive Overload", value: cognitiveOverload, icon: "fa-brain" },
    { label: "Emotional Strain", value: emotionalStrain, icon: "fa-heart-crack" },
  ];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Risk Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${risk.color}15` }}
          >
            <i className="fas fa-shield-heart" style={{ color: risk.color, fontSize: "0.65rem" }} />
          </div>
          <div>
            <span className="font-semibold text-xs block" style={{ color: theme.colors.text.primary }}>
              Burnout Risk
            </span>
            <span className="font-bold" style={{ fontSize: "0.55rem", color: risk.color }}>
              {risk.label}
            </span>
          </div>
        </div>
        <span className="font-black text-lg tabular-nums" style={{ color: risk.color }}>
          {interpRisk}
          <span className="font-medium text-xs" style={{ color: theme.colors.text.subtle }}>%</span>
        </span>
      </div>

      {/* Indicator bars */}
      <div className="space-y-2">
        {indicators.map((ind) => {
          const pct = Math.round(ind.value * 100);
          const indRisk = getRiskLevel(pct);
          return (
            <div key={ind.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <i className={`fas ${ind.icon}`} style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }} />
                  <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{ind.label}</span>
                </div>
                <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: indRisk.color }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: indRisk.color }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestion */}
      {suggestion && !compact && (
        <div
          className="mt-3 p-2.5 rounded-lg flex items-start gap-2"
          style={{ background: `${risk.color}06`, border: `1px solid ${risk.color}15` }}
        >
          <i className="fas fa-hand-holding-heart mt-0.5" style={{ color: risk.color, fontSize: "0.55rem" }} />
          <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {suggestion}
          </span>
        </div>
      )}
    </motion.div>
  );
});

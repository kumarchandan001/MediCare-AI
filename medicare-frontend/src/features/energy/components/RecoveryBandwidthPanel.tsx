/**
 * RecoveryBandwidthPanel — Recovery depth + intervention fatigue
 *
 * Shows available recovery capacity and how much intervention fatigue
 * has accumulated. Helps users understand when to accept rest.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp } from "@/animations";

interface RecoveryBandwidthPanelProps {
  recoveryBandwidth: number;      // 0–1
  interventionFatigue: number;    // 0–1
  restQuality: number;            // 0–100
  nextRecoveryWindow?: string;    // e.g. "In ~2 hours"
  suggestion?: string;
  compact?: boolean;
}

export const RecoveryBandwidthPanel = memo(function RecoveryBandwidthPanel({
  recoveryBandwidth,
  interventionFatigue,
  restQuality,
  nextRecoveryWindow,
  suggestion,
  compact = false,
}: RecoveryBandwidthPanelProps) {
  const bwPct = Math.round(recoveryBandwidth * 100);
  const fatiguePct = Math.round(interventionFatigue * 100);
  const interpBw = useInterpolatedMetric(bwPct, { duration: 400 });
  const interpRQ = useInterpolatedMetric(restQuality, { duration: 400 });

  const bwColor = bwPct >= 60 ? theme.colors.health.recovery.DEFAULT : bwPct >= 30 ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT;
  const fatigueColor = fatiguePct < 30 ? theme.colors.health.recovery.DEFAULT : fatiguePct < 60 ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT;

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Main metrics */}
      <div className={`grid gap-3 mb-3 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
        {/* Recovery Bandwidth */}
        <div className="text-center">
          <span className="font-black text-xl tabular-nums block" style={{ color: bwColor }}>
            {interpBw}%
          </span>
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            Recovery Bandwidth
          </span>
        </div>

        {/* Rest Quality */}
        <div className="text-center">
          <span className="font-black text-xl tabular-nums block" style={{ color: theme.colors.health.sleep.DEFAULT }}>
            {interpRQ}
          </span>
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            Rest Quality
          </span>
        </div>

        {/* Intervention Fatigue (hidden on compact) */}
        {!compact && (
          <div className="text-center">
            <span className="font-black text-xl tabular-nums block" style={{ color: fatigueColor }}>
              {fatiguePct}%
            </span>
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
              Intervention Fatigue
            </span>
          </div>
        )}
      </div>

      {/* Bandwidth bar */}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>Available Recovery Capacity</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: theme.colors.surface[4] }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: bwColor }}
            animate={{ width: `${bwPct}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Fatigue bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>Intervention Fatigue</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: theme.colors.surface[4] }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: fatigueColor }}
            animate={{ width: `${fatiguePct}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Recovery window */}
      {nextRecoveryWindow && (
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-clock" style={{ fontSize: "0.45rem", color: theme.colors.text.subtle }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>
            Next recovery window: {nextRecoveryWindow}
          </span>
        </div>
      )}

      {/* Suggestion */}
      {suggestion && !compact && (
        <div
          className="p-2.5 rounded-lg flex items-start gap-2"
          style={{ background: `${bwColor}06`, border: `1px solid ${bwColor}12` }}
        >
          <i className="fas fa-spa mt-0.5" style={{ color: bwColor, fontSize: "0.5rem" }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {suggestion}
          </span>
        </div>
      )}
    </motion.div>
  );
});

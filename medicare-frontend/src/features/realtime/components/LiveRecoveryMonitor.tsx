/**
 * LiveRecoveryMonitor — Realtime recovery bandwidth indicator
 * 
 * Shows current recovery state with animated progress and
 * contextual recovery guidance. Uses interpolation for smooth transitions.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { fadeInUp } from "@/animations";

interface LiveRecoveryMonitorProps {
  recoveryScore: number;        // 0–100
  recoveryBandwidth: number;    // 0–1
  fatigueLevel: number;         // 0–100
  resilienceScore?: number;     // 0–100
  recoveryPhase?: "active" | "resting" | "deep" | "impaired";
  suggestion?: string;
  compact?: boolean;
}

const phaseConfig = {
  active: { color: theme.colors.health.strain.DEFAULT, label: "Active Recovery", icon: "fa-person-running" },
  resting: { color: theme.colors.health.recovery.DEFAULT, label: "Resting", icon: "fa-bed" },
  deep: { color: theme.colors.health.sleep.DEFAULT, label: "Deep Recovery", icon: "fa-moon" },
  impaired: { color: theme.colors.health.warning.DEFAULT, label: "Impaired", icon: "fa-triangle-exclamation" },
};

export const LiveRecoveryMonitor = memo(function LiveRecoveryMonitor({
  recoveryScore,
  recoveryBandwidth,
  fatigueLevel,
  resilienceScore,
  recoveryPhase = "resting",
  suggestion,
  compact = false,
}: LiveRecoveryMonitorProps) {
  const interpRecovery = useInterpolatedMetric(recoveryScore, { duration: 500 });
  const interpFatigue = useInterpolatedMetric(fatigueLevel, { duration: 500 });
  const phase = phaseConfig[recoveryPhase];

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Phase Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${phase.color}15` }}
          >
            <i className={`fas ${phase.icon}`} style={{ color: phase.color, fontSize: "0.65rem" }} />
          </div>
          <div>
            <span className="font-semibold text-xs block" style={{ color: phase.color }}>
              {phase.label}
            </span>
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
              Recovery Phase
            </span>
          </div>
        </div>
        <span className="font-black text-xl tabular-nums" style={{ color: theme.colors.text.primary }}>
          {interpRecovery}
          <span className="font-medium text-xs ml-0.5" style={{ color: theme.colors.text.subtle }}>%</span>
        </span>
      </div>

      {/* Recovery bar */}
      <div className="space-y-2">
        {/* Recovery Bandwidth */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>Recovery Bandwidth</span>
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>{Math.round(recoveryBandwidth * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: theme.colors.health.recovery.DEFAULT }}
              animate={{ width: `${recoveryBandwidth * 100}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        {/* Fatigue Level */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>Fatigue Level</span>
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>{interpFatigue}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: fatigueLevel > 70
                  ? theme.colors.health.danger.DEFAULT
                  : fatigueLevel > 40
                  ? theme.colors.health.warning.DEFAULT
                  : theme.colors.health.recovery.DEFAULT,
              }}
              animate={{ width: `${fatigueLevel}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        {/* Resilience Score (optional) */}
        {resilienceScore !== undefined && !compact && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>Resilience</span>
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.muted }}>{resilienceScore}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: theme.colors.health.strain.DEFAULT }}
                animate={{ width: `${resilienceScore}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Suggestion */}
      {suggestion && !compact && (
        <div
          className="mt-3 p-3 rounded-lg flex items-start gap-2"
          style={{
            background: `${phase.color}08`,
            border: `1px solid ${phase.color}20`,
          }}
        >
          <i className="fas fa-sparkles mt-0.5" style={{ color: phase.color, fontSize: "0.6rem" }} />
          <span style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {suggestion}
          </span>
        </div>
      )}
    </motion.div>
  );
});

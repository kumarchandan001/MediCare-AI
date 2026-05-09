/**
 * OrchestrationOverview — Dashboard widget showing Digital Twin status
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme, getScoreColor } from "@/config/theme";
import { HealthGauge } from "@/components/HealthGauge";
import { fadeInUp, staggerContainer, staggerItem } from "@/animations";

interface OrchestrationOverviewProps {
  twinState?: {
    wellness_score: number;
    stress_level: number;
    recovery_score: number;
    resilience_score: number;
    archetype: string;
    identity_stability: number;
  };
  energyBudget?: {
    cognitive_load: number;
    intervention_fatigue: number;
    recovery_bandwidth: number;
    budget_remaining: number;
  };
  governance?: {
    ethical_compliance: boolean;
    alignment_score: number;
    pacing_active: boolean;
  };
  isLoading?: boolean;
}

export const OrchestrationOverview = memo(function OrchestrationOverview({
  twinState,
  energyBudget,
  governance,
  isLoading = false,
}: OrchestrationOverviewProps) {
  if (isLoading || !twinState) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ background: theme.colors.surface[3], height: "100px" }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {/* Twin Gauges */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
        <HealthGauge value={twinState.wellness_score} label="Wellness" size={72} strokeWidth={5} />
        <HealthGauge value={twinState.recovery_score} label="Recovery" size={72} strokeWidth={5} color={theme.colors.health.recovery.DEFAULT} />
        <HealthGauge value={twinState.resilience_score} label="Resilience" size={72} strokeWidth={5} color={theme.colors.health.strain.DEFAULT} />
        <div className="hidden sm:block">
          <HealthGauge value={100 - twinState.stress_level} label="Calm" size={72} strokeWidth={5} color={theme.colors.health.sleep.DEFAULT} />
        </div>
      </div>

      {/* Archetype + Stability */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fas fa-fingerprint text-xs" style={{ color: theme.colors.accent.primary }} />
          <span className="text-xs font-semibold" style={{ color: theme.colors.text.muted }}>
            Archetype:
          </span>
          <span className="text-xs font-bold capitalize" style={{ color: theme.colors.text.primary }}>
            {twinState.archetype}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: "40px",
              background: theme.colors.surface[4],
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${twinState.identity_stability * 100}%`,
                background: getScoreColor(twinState.identity_stability * 100),
              }}
            />
          </div>
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
            {Math.round(twinState.identity_stability * 100)}% stable
          </span>
        </div>
      </motion.div>

      {/* Energy Budget */}
      {energyBudget && (
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-battery-half text-xs" style={{ color: theme.colors.health.warning.DEFAULT }} />
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Energy Budget
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Cognitive", value: energyBudget.cognitive_load, invert: true },
              { label: "Fatigue", value: energyBudget.intervention_fatigue, invert: true },
              { label: "Recovery", value: energyBudget.recovery_bandwidth, invert: false },
              { label: "Remaining", value: energyBudget.budget_remaining, invert: false },
            ].map((item) => {
              const displayVal = Math.round(item.value * 100);
              const barColor = item.invert
                ? getScoreColor(100 - displayVal)
                : getScoreColor(displayVal);
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, width: "56px" }}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: theme.colors.surface[4] }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${displayVal}%`, background: barColor }}
                    />
                  </div>
                  <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, width: "24px", textAlign: "right" }}>
                    {displayVal}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Governance */}
      {governance && (
        <motion.div variants={staggerItem} className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <i
              className={`fas ${governance.ethical_compliance ? "fa-shield-check" : "fa-shield-exclamation"} text-xs`}
              style={{ color: governance.ethical_compliance ? theme.colors.health.recovery.DEFAULT : theme.colors.health.danger.DEFAULT }}
            />
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
              {governance.ethical_compliance ? "Compliant" : "Review"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-compass text-xs" style={{ color: theme.colors.accent.primary }} />
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
              Alignment: {Math.round(governance.alignment_score * 100)}%
            </span>
          </div>
          {governance.pacing_active && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-gauge-low text-xs" style={{ color: theme.colors.health.sleep.DEFAULT }} />
              <span style={{ fontSize: "0.6rem", color: theme.colors.health.sleep.DEFAULT }}>
                Calm Pacing
              </span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

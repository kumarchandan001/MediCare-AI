/**
 * WearableContinuityPanel — Wearable trends contextualized within
 * recovery, stress, sleep, and investigation context.
 * No isolated physiological charts — everything is narrative-driven.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";

export default function WearableContinuityPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { wearableContinuity, activeRecovery } = useTemporalHealth();

  const hasData = wearableContinuity.lastSyncTimestamp > 0;
  if (!hasData) return null;

  const w = wearableContinuity;

  // Build contextual insights instead of raw data
  const insights: { icon: string; label: string; narrative: string; color: string; value: string }[] = [];

  // Heart rate in recovery context
  const hrDiff = w.restingHR.current - w.restingHR.baseline;
  insights.push({
    icon: "fa-heart-pulse",
    label: "Heart Rate",
    value: `${w.restingHR.current} bpm`,
    narrative: activeRecovery
      ? (hrDiff > 5
          ? `Resting heart rate is ${hrDiff.toFixed(0)} bpm above your baseline, which may reflect ongoing recovery from ${activeRecovery.activeCondition}.`
          : hrDiff < -3
            ? `Resting heart rate is settling below baseline — a positive sign during ${activeRecovery.activeCondition} recovery.`
            : `Resting heart rate remains near your baseline during ${activeRecovery.activeCondition} recovery.`)
      : (w.restingHR.trend === "rising"
          ? "Resting heart rate has been gradually increasing. This could reflect stress, dehydration, or early health changes."
          : w.restingHR.trend === "falling"
            ? "Resting heart rate is trending lower — generally a positive cardiovascular indicator."
            : "Resting heart rate is stable and within your normal range."),
    color: w.restingHR.trend === "rising" ? theme.colors.health.warning.DEFAULT : theme.colors.health.recovery.DEFAULT,
  });

  // HRV in stress context
  insights.push({
    icon: "fa-wave-square",
    label: "Heart Rate Variability",
    value: `${w.hrv.current} ms`,
    narrative: w.hrv.trend === "falling"
      ? "HRV has been declining, which often correlates with increased stress or insufficient recovery. Consider rest and stress management."
      : w.hrv.trend === "rising"
        ? "HRV is improving — your body's recovery capacity appears to be strengthening."
        : "HRV is stable, indicating consistent autonomic nervous system balance.",
    color: w.hrv.trend === "falling" ? theme.colors.health.warning.DEFAULT : theme.colors.health.recovery.DEFAULT,
  });

  // Sleep in recovery context
  insights.push({
    icon: "fa-moon",
    label: "Sleep Quality",
    value: `${w.sleepScore.current}%`,
    narrative: activeRecovery
      ? (w.sleepScore.trend === "declining"
          ? `Sleep quality is declining during ${activeRecovery.activeCondition} recovery. Quality rest is important for healing.`
          : `Sleep patterns are ${w.sleepScore.trend === "improving" ? "improving" : "stable"} — supportive of recovery.`)
      : (w.sleepScore.trend === "declining"
          ? "Sleep quality has been declining. Poor sleep can affect immune function and overall wellbeing."
          : "Sleep quality is within healthy parameters."),
    color: w.sleepScore.trend === "declining" ? theme.colors.health.warning.DEFAULT : theme.colors.health.sleep.DEFAULT,
  });

  // Stress in investigation context
  if (w.stressLevel.current > 0) {
    insights.push({
      icon: "fa-brain",
      label: "Stress Level",
      value: w.stressLevel.current <= 30 ? "Low" : w.stressLevel.current <= 60 ? "Moderate" : "Elevated",
      narrative: w.stressLevel.trend === "rising"
        ? "Stress indicators have been rising. Elevated stress can mask or amplify symptom perception during investigations."
        : "Stress levels appear manageable, supporting clearer symptom assessment.",
      color: w.stressLevel.trend === "rising" ? theme.colors.health.strain.DEFAULT : theme.colors.health.recovery.DEFAULT,
    });
  }

  // Drift detection
  if (w.driftDetected) {
    insights.push({
      icon: "fa-arrow-trend-up",
      label: "Physiological Drift",
      value: "Detected",
      narrative: w.driftDetails || "Wearable data shows gradual deviation from your baseline. This may precede symptom onset — worth monitoring.",
      color: theme.colors.health.warning.DEFAULT,
    });
  }

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={onToggle}>
        <div className="ucw-section-icon" style={{ background: "rgba(0,180,255,0.1)", color: theme.colors.health.strain.DEFAULT }}>
          <i className="fas fa-watch" />
        </div>
        <div className="ucw-section-title">Wearable Continuity</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,180,255,0.08)", color: theme.colors.health.strain.DEFAULT,
          border: "1px solid rgba(0,180,255,0.15)",
        }}>
          {w.reliabilityScore > 0 ? `${w.reliabilityScore}% reliable` : "synced"}
        </span>
        <i className={`fas fa-chevron-down ucw-section-chevron ${expanded ? "expanded" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="ucw-section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((insight, i) => (
                <motion.div
                  key={insight.label}
                  className="lh-wearable-insight"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="lh-wearable-insight-header">
                    <div className="lh-wearable-insight-icon" style={{ background: `${insight.color}12`, color: insight.color }}>
                      <i className={`fas ${insight.icon}`} />
                    </div>
                    <span className="lh-wearable-insight-label">{insight.label}</span>
                    <span className="lh-wearable-insight-value" style={{ color: insight.color }}>{insight.value}</span>
                  </div>
                  <div className="lh-wearable-insight-narrative">{insight.narrative}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

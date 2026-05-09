/**
 * InterventionExplanationPanel — Explains why a nudge was sent
 *
 * Links the coaching nudge back to the orchestration layer
 * with a clear, human-readable rationale.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";

interface InterventionExplanationPanelProps {
  interventionTitle: string;
  trigger: string;                 // what triggered it
  orchestrationContext: string;    // what the system was prioritizing
  agentSource: string;             // which agent sent it
  confidence: number;              // 0–1
  alternativesConsidered?: string[];
  userBenefit: string;             // why this helps the user
}

export const InterventionExplanationPanel = memo(function InterventionExplanationPanel({
  interventionTitle,
  trigger,
  orchestrationContext,
  agentSource,
  confidence,
  alternativesConsidered,
  userBenefit,
}: InterventionExplanationPanelProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="rounded-xl p-4"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${theme.colors.accent.primary}10` }}
        >
          <i className="fas fa-circle-question" style={{ color: theme.colors.accent.primary, fontSize: "0.6rem" }} />
        </div>
        <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
          Why "{interventionTitle}"?
        </span>
      </div>

      {/* Explanation rows */}
      <div className="space-y-2.5">
        <ExplainRow
          icon="fa-bolt"
          label="Triggered by"
          value={trigger}
          color={theme.colors.health.warning.DEFAULT}
        />
        <ExplainRow
          icon="fa-gauge"
          label="System priority"
          value={orchestrationContext}
          color={theme.colors.accent.primary}
        />
        <ExplainRow
          icon="fa-robot"
          label="Source agent"
          value={agentSource}
          color={theme.colors.health.strain.DEFAULT}
        />
        <ExplainRow
          icon="fa-chart-simple"
          label="Confidence"
          value={`${Math.round(confidence * 100)}%`}
          color={confidence >= 0.7 ? theme.colors.health.recovery.DEFAULT : theme.colors.health.warning.DEFAULT}
        />
      </div>

      {/* Alternatives considered */}
      {alternativesConsidered && alternativesConsidered.length > 0 && (
        <div className="mt-3">
          <span
            className="font-bold uppercase tracking-widest block mb-1.5"
            style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}
          >
            Alternatives Considered
          </span>
          {alternativesConsidered.map((alt, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 rounded-full" style={{ background: theme.colors.text.subtle }} />
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{alt}</span>
            </div>
          ))}
        </div>
      )}

      {/* User benefit */}
      <div
        className="mt-3 p-2.5 rounded-lg flex items-start gap-2"
        style={{ background: `${theme.colors.health.recovery.DEFAULT}06`, border: `1px solid ${theme.colors.health.recovery.DEFAULT}12` }}
      >
        <i className="fas fa-hand-holding-heart mt-0.5" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.5rem" }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
          <strong style={{ color: theme.colors.text.primary }}>For you:</strong> {userBenefit}
        </span>
      </div>
    </motion.div>
  );
});

// ── Helper row component ──
function ExplainRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
        style={{ background: `${color}10` }}
      >
        <i className={`fas ${icon}`} style={{ fontSize: "0.4rem", color }} />
      </div>
      <div className="flex-1 min-w-0">
        <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>{label}</span>
        <span className="block font-medium text-xs" style={{ color: theme.colors.text.muted }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * ReasoningChainViewer — Causal logic breakdown
 *
 * Step-by-step visual of the reasoning behind an insight or intervention.
 * Uses simple, human-readable language.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface ReasoningStep {
  id: string;
  label: string;
  detail: string;
  confidence: number;   // 0–1
  type: "observation" | "inference" | "decision" | "outcome";
}

interface ReasoningChainViewerProps {
  title: string;
  steps: ReasoningStep[];
  conclusion?: string;
  expandedByDefault?: boolean;
}

const stepIcon: Record<string, { icon: string; color: string }> = {
  observation: { icon: "fa-eye", color: theme.colors.health.strain.DEFAULT },
  inference: { icon: "fa-brain", color: "#8B6BFF" },
  decision: { icon: "fa-code-branch", color: theme.colors.accent.primary },
  outcome: { icon: "fa-flag-checkered", color: theme.colors.health.recovery.DEFAULT },
};

export const ReasoningChainViewer = memo(function ReasoningChainViewer({
  title,
  steps,
  conclusion,
  expandedByDefault = false,
}: ReasoningChainViewerProps) {
  const [expanded, setExpanded] = useState(expandedByDefault);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-diagram-project" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
          <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
            {title}
          </span>
        </div>
        <motion.i
          className="fas fa-chevron-down text-xs"
          style={{ color: theme.colors.text.subtle }}
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </button>

      {/* Reasoning chain */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="relative pt-3"
              >
                {/* Vertical chain line */}
                <div
                  className="absolute left-[9px] top-6 bottom-4 w-px"
                  style={{ background: theme.colors.border[2] }}
                />

                <div className="space-y-2.5">
                  {steps.map((step, i) => {
                    const cfg = stepIcon[step.type];
                    return (
                      <motion.div key={step.id} variants={staggerItem} className="flex items-start gap-3 relative">
                        {/* Step dot */}
                        <div className="relative z-10 shrink-0" style={{ width: "18px" }}>
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
                          >
                            <i className={`fas ${cfg.icon}`} style={{ fontSize: "0.35rem", color: cfg.color }} />
                          </div>
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" style={{ fontSize: "0.65rem", color: theme.colors.text.primary }}>
                              {step.label}
                            </span>
                            <span
                              className="px-1 py-0.5 rounded"
                              style={{ fontSize: "0.4rem", background: theme.colors.surface[5], color: theme.colors.text.subtle }}
                            >
                              {Math.round(step.confidence * 100)}%
                            </span>
                          </div>
                          <p style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.35 }}>
                            {step.detail}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Conclusion */}
                {conclusion && (
                  <div className="mt-3 flex items-start gap-2">
                    <i className="fas fa-arrow-right mt-0.5" style={{ fontSize: "0.4rem", color: theme.colors.accent.primary }} />
                    <span className="font-semibold" style={{ fontSize: "0.65rem", color: theme.colors.accent.primary, lineHeight: 1.35 }}>
                      {conclusion}
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

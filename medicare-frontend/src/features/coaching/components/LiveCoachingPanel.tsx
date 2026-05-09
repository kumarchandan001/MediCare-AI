/**
 * LiveCoachingPanel — Adaptive, context-aware health nudges
 * 
 * Surfaces calm, human-centric coaching insights based on
 * realtime physiological context. Non-judgmental and supportive.
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem, fadeInUp } from "@/animations";

interface CoachingNudge {
  id: string;
  type: "recovery" | "hydration" | "movement" | "stress" | "sleep" | "nutrition" | "mindfulness";
  title: string;
  message: string;
  reasoning?: string;
  confidence?: number;       // 0–1
  contextSource?: string;    // e.g. "Based on your stress trend"
  priority: "gentle" | "suggested" | "recommended";
}

interface LiveCoachingPanelProps {
  nudges: CoachingNudge[];
  coachPersonality?: string;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const nudgeIcons: Record<string, { icon: string; color: string }> = {
  recovery: { icon: "fa-heart-circle-check", color: theme.colors.health.recovery.DEFAULT },
  hydration: { icon: "fa-glass-water", color: "#6BB8FF" },
  movement: { icon: "fa-person-walking", color: theme.colors.health.strain.DEFAULT },
  stress: { icon: "fa-spa", color: "#8B6BFF" },
  sleep: { icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT },
  nutrition: { icon: "fa-carrot", color: "#FFB86B" },
  mindfulness: { icon: "fa-brain", color: theme.colors.accent.primary },
};

const priorityStyle: Record<string, { borderColor: string }> = {
  gentle: { borderColor: theme.colors.border[1] },
  suggested: { borderColor: `${theme.colors.accent.primary}20` },
  recommended: { borderColor: `${theme.colors.health.recovery.DEFAULT}25` },
};

export const LiveCoachingPanel = memo(function LiveCoachingPanel({
  nudges,
  coachPersonality,
  onDismiss,
  compact = false,
}: LiveCoachingPanelProps) {
  if (nudges.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4">
        <i className="fas fa-check-circle text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
        <span style={{ fontSize: "0.7rem", color: theme.colors.text.subtle }}>
          You're on track — no new guidance right now
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Coach identity */}
      {coachPersonality && !compact && (
        <div className="flex items-center gap-1.5 mb-3">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `${theme.colors.accent.primary}15` }}
          >
            <i className="fas fa-robot" style={{ color: theme.colors.accent.primary, fontSize: "0.45rem" }} />
          </div>
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            {coachPersonality} Coach
          </span>
        </div>
      )}

      {/* Nudges */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        <AnimatePresence>
          {nudges.map((nudge) => {
            const cfg = nudgeIcons[nudge.type] || nudgeIcons.recovery;
            const border = priorityStyle[nudge.priority];

            return (
              <motion.div
                key={nudge.id}
                variants={staggerItem}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className={`rounded-xl overflow-hidden ${compact ? "p-2.5" : "p-3"}`}
                style={{
                  background: theme.colors.surface[2],
                  border: `1px solid ${border.borderColor}`,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}10` }}
                  >
                    <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "0.6rem" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                        {nudge.title}
                      </span>
                      {nudge.confidence !== undefined && (
                        <span
                          className="px-1 py-0.5 rounded"
                          style={{
                            fontSize: "0.45rem",
                            background: `${cfg.color}12`,
                            color: cfg.color,
                            fontWeight: 700,
                          }}
                        >
                          {Math.round(nudge.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.45 }}>
                      {nudge.message}
                    </p>

                    {/* Context source */}
                    {nudge.contextSource && !compact && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <i className="fas fa-chart-line" style={{ color: theme.colors.text.subtle, fontSize: "0.4rem" }} />
                        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                          {nudge.contextSource}
                        </span>
                      </div>
                    )}

                    {/* Reasoning */}
                    {nudge.reasoning && !compact && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <i className="fas fa-lightbulb mt-0.5" style={{ color: cfg.color, fontSize: "0.4rem" }} />
                        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, lineHeight: 1.3 }}>
                          {nudge.reasoning}
                        </span>
                      </div>
                    )}
                  </div>

                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(nudge.id)}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ color: theme.colors.text.subtle }}
                    >
                      <i className="fas fa-xmark" style={{ fontSize: "0.5rem" }} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

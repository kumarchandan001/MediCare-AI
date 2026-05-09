/**
 * RealtimeInterventionPrompts — Paced, actionable live prompts
 * 
 * Surfaces gentle interventions from the coaching engine with
 * accept/dismiss actions and pacing to avoid spamming.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";

interface InterventionPrompt {
  id: string;
  type: "hydration" | "movement" | "breathing" | "rest" | "nutrition" | "social";
  title: string;
  message: string;
  reasoning?: string;
  urgency: "gentle" | "moderate" | "important";
}

interface RealtimeInterventionPromptsProps {
  prompts: InterventionPrompt[];
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  maxVisible?: number;
}

const typeConfig: Record<string, { icon: string; color: string }> = {
  hydration: { icon: "fa-droplet", color: "#6BB8FF" },
  movement: { icon: "fa-person-walking", color: theme.colors.health.strain.DEFAULT },
  breathing: { icon: "fa-wind", color: "#8B6BFF" },
  rest: { icon: "fa-bed", color: theme.colors.health.sleep.DEFAULT },
  nutrition: { icon: "fa-apple-whole", color: theme.colors.health.recovery.DEFAULT },
  social: { icon: "fa-users", color: theme.colors.accent.primary },
};

const urgencyBorder: Record<string, string> = {
  gentle: theme.colors.border[1],
  moderate: `${theme.colors.health.warning.DEFAULT}20`,
  important: `${theme.colors.accent.primary}30`,
};

export const RealtimeInterventionPrompts = memo(function RealtimeInterventionPrompts({
  prompts,
  onAccept,
  onDismiss,
  maxVisible = 2,
}: RealtimeInterventionPromptsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = prompts
    .filter((p) => !dismissed.has(p.id))
    .slice(0, maxVisible);

  if (visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map((prompt) => {
          const cfg = typeConfig[prompt.type] || typeConfig.movement;

          return (
            <motion.div
              key={prompt.id}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
              className="rounded-xl p-3 sm:p-4"
              style={{
                background: theme.colors.surface[2],
                border: `1px solid ${urgencyBorder[prompt.urgency]}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${cfg.color}12` }}
                >
                  <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "0.7rem" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs block mb-0.5" style={{ color: theme.colors.text.primary }}>
                    {prompt.title}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: theme.colors.text.muted }}>
                    {prompt.message}
                  </p>
                  {prompt.reasoning && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <i className="fas fa-sparkles mt-0.5" style={{ color: cfg.color, fontSize: "0.45rem" }} />
                      <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, lineHeight: 1.3 }}>
                        {prompt.reasoning}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2.5">
                    {onAccept && (
                      <button
                        onClick={() => onAccept(prompt.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}25` }}
                      >
                        Got it
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(prompt.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: theme.colors.text.subtle }}
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

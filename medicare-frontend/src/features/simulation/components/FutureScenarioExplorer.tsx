/**
 * FutureScenarioExplorer — Interactive future branching
 *
 * Lets users explore "what-if" wellness scenarios by toggling
 * behavioral choices. Always framed positively and probabilistically.
 *
 * SAFETY: Uses bounded projection language — never deterministic.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, staggerContainer, staggerItem } from "@/animations";

interface ScenarioChoice {
  id: string;
  label: string;
  icon: string;
  description: string;
  impact: "positive" | "neutral" | "mixed";
}

interface ScenarioOutcome {
  metric: string;
  current: number;
  projected: number;
  confidence: number;    // 0–1
  direction: "up" | "down" | "stable";
  unit?: string;
}

interface FutureScenarioExplorerProps {
  scenarios: ScenarioChoice[];
  outcomes: Record<string, ScenarioOutcome[]>;  // keyed by scenario ID
  timeHorizon?: string;  // e.g. "Next 48 hours"
  disclaimer?: string;
}

const impactColor = {
  positive: theme.colors.health.recovery.DEFAULT,
  neutral: theme.colors.text.subtle,
  mixed: theme.colors.health.warning.DEFAULT,
};

const directionIcon = {
  up: "fa-arrow-up",
  down: "fa-arrow-down",
  stable: "fa-minus",
};

export const FutureScenarioExplorer = memo(function FutureScenarioExplorer({
  scenarios,
  outcomes,
  timeHorizon = "Next 48 hours",
  disclaimer = "These projections are probabilistic estimates, not medical predictions. Your actual wellness may vary based on many factors.",
}: FutureScenarioExplorerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const activeOutcomes = selected ? outcomes[selected] : null;

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${theme.colors.accent.primary}10` }}
          >
            <i className="fas fa-code-branch" style={{ color: theme.colors.accent.primary, fontSize: "0.6rem" }} />
          </div>
          <div>
            <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
              Explore Your Futures
            </span>
            <span className="block" style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
              {timeHorizon}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario choices */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4"
      >
        {scenarios.map((s) => {
          const isActive = selected === s.id;
          return (
            <motion.button
              key={s.id}
              variants={staggerItem}
              onClick={() => setSelected(isActive ? null : s.id)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: isActive ? `${impactColor[s.impact]}08` : theme.colors.surface[3],
                border: `1px solid ${isActive ? `${impactColor[s.impact]}25` : theme.colors.border[1]}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={`fas ${s.icon}`} style={{ fontSize: "0.55rem", color: impactColor[s.impact] }} />
                <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                  {s.label}
                </span>
              </div>
              <p style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.35 }}>
                {s.description}
              </p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Projected outcomes */}
      <AnimatePresence>
        {activeOutcomes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl p-4 mb-3"
              style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
            >
              <span
                className="font-bold uppercase tracking-widest block mb-3"
                style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}
              >
                Projected Trajectory
              </span>

              <div className="space-y-2.5">
                {activeOutcomes.map((o) => {
                  const dirColor = o.direction === "up" ? theme.colors.health.recovery.DEFAULT : o.direction === "down" ? theme.colors.health.warning.DEFAULT : theme.colors.text.subtle;
                  return (
                    <div key={o.metric} className="flex items-center justify-between">
                      <span style={{ fontSize: "0.7rem", color: theme.colors.text.muted }}>{o.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums" style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
                          {o.current}{o.unit}
                        </span>
                        <i className={`fas ${directionIcon[o.direction]}`} style={{ fontSize: "0.4rem", color: dirColor }} />
                        <span className="font-bold tabular-nums" style={{ fontSize: "0.7rem", color: dirColor }}>
                          ~{o.projected}{o.unit}
                        </span>
                        <span
                          className="px-1 py-0.5 rounded"
                          style={{ fontSize: "0.4rem", color: theme.colors.text.subtle, background: theme.colors.surface[5] }}
                        >
                          {Math.round(o.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety disclaimer */}
      <div
        className="rounded-lg p-2.5 flex items-start gap-2"
        style={{ background: theme.colors.surface[1], border: `1px solid ${theme.colors.border[1]}` }}
      >
        <i className="fas fa-shield-halved mt-0.5" style={{ fontSize: "0.45rem", color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, lineHeight: 1.35 }}>
          {disclaimer}
        </span>
      </div>
    </motion.div>
  );
});

/**
 * BehavioralAdaptationMap — Visualizes successful habit adaptations
 *
 * Shows how the user's behaviors have adapted in response to stressors,
 * highlighting successful coping strategies.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface Adaptation {
  id: string;
  stressor: string;          // what triggered the change
  adaptation: string;        // what the user adapted
  outcome: string;           // positive result
  status: "emerging" | "established" | "integrated";
  timeframe: string;
}

interface BehavioralAdaptationMapProps {
  adaptations: Adaptation[];
}

const statusStyle = {
  emerging: { color: theme.colors.health.strain.DEFAULT, icon: "fa-seedling", label: "Emerging" },
  established: { color: theme.colors.accent.primary, icon: "fa-circle-check", label: "Established" },
  integrated: { color: theme.colors.health.recovery.DEFAULT, icon: "fa-gem", label: "Integrated" },
};

export const BehavioralAdaptationMap = memo(function BehavioralAdaptationMap({
  adaptations,
}: BehavioralAdaptationMapProps) {
  if (adaptations.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-compass text-sm mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          Adaptation patterns are forming — check back soon.
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
      {adaptations.map((a) => {
        const s = statusStyle[a.status];
        return (
          <motion.div
            key={a.id}
            variants={staggerItem}
            className="rounded-xl p-3.5"
            style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
          >
            {/* Stressor → Adaptation flow */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ background: `${theme.colors.health.warning.DEFAULT}10`, color: theme.colors.health.warning.DEFAULT, fontSize: "0.55rem" }}
              >
                {a.stressor}
              </span>
              <i className="fas fa-arrow-right" style={{ fontSize: "0.4rem", color: theme.colors.text.subtle }} />
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ background: `${s.color}10`, color: s.color, fontSize: "0.55rem" }}
              >
                {a.adaptation}
              </span>
            </div>

            {/* Outcome */}
            <div className="flex items-start gap-2 mb-2">
              <i className="fas fa-check-circle mt-0.5" style={{ fontSize: "0.45rem", color: theme.colors.health.recovery.DEFAULT }} />
              <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
                {a.outcome}
              </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <i className={`fas ${s.icon}`} style={{ fontSize: "0.4rem", color: s.color }} />
                <span className="font-bold" style={{ fontSize: "0.5rem", color: s.color }}>
                  {s.label}
                </span>
              </div>
              <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                {a.timeframe}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

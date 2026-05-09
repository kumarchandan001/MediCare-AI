/**
 * AgentDecisionFlow — Agent coordination visualization
 *
 * Shows how wellness agents negotiate and coordinate decisions.
 * Transparent and collaborative-feeling. Non-authoritarian.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface AgentState {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentGoal: string;
  confidence: number;       // 0–1
  status: "active" | "observing" | "yielding" | "escalating";
  yieldingTo?: string;      // another agent name
}

interface AgentDecisionFlowProps {
  agents: AgentState[];
  currentDecision?: string;  // e.g. "Prioritizing sleep recovery over activity targets"
}

const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: `${theme.colors.health.recovery.DEFAULT}12`, color: theme.colors.health.recovery.DEFAULT, label: "Active" },
  observing: { bg: `${theme.colors.text.subtle}10`, color: theme.colors.text.subtle, label: "Observing" },
  yielding: { bg: `${theme.colors.health.warning.DEFAULT}10`, color: theme.colors.health.warning.DEFAULT, label: "Yielding" },
  escalating: { bg: `${theme.colors.accent.primary}10`, color: theme.colors.accent.primary, label: "Escalating" },
};

export const AgentDecisionFlow = memo(function AgentDecisionFlow({
  agents,
  currentDecision,
}: AgentDecisionFlowProps) {
  return (
    <div>
      {/* Current decision context */}
      {currentDecision && (
        <div
          className="rounded-xl p-3 mb-3 flex items-start gap-2"
          style={{ background: `${theme.colors.accent.primary}06`, border: `1px solid ${theme.colors.accent.primary}12` }}
        >
          <i className="fas fa-handshake mt-0.5" style={{ color: theme.colors.accent.primary, fontSize: "0.55rem" }} />
          <span style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
            {currentDecision}
          </span>
        </div>
      )}

      {/* Agent cards */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {agents.map((agent) => {
          const badge = statusBadge[agent.status];
          return (
            <motion.div
              key={agent.id}
              variants={staggerItem}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
            >
              {/* Agent icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${agent.color}10` }}
              >
                <i className={`fas ${agent.icon}`} style={{ color: agent.color, fontSize: "0.6rem" }} />
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                    {agent.name}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full font-bold"
                    style={{ fontSize: "0.45rem", background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: "0.6rem", color: theme.colors.text.muted, lineHeight: 1.35 }}>
                  {agent.currentGoal}
                </p>
                {agent.yieldingTo && (
                  <span className="block mt-0.5" style={{ fontSize: "0.5rem", color: theme.colors.health.warning.DEFAULT }}>
                    Collaborating with {agent.yieldingTo}
                  </span>
                )}
              </div>

              {/* Confidence */}
              <div className="shrink-0 text-center">
                <span className="font-bold tabular-nums block" style={{ fontSize: "0.65rem", color: agent.color }}>
                  {Math.round(agent.confidence * 100)}%
                </span>
                <span style={{ fontSize: "0.4rem", color: theme.colors.text.subtle }}>conf.</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});

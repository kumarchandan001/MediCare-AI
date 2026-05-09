/**
 * PhysiologicalIdentityCard — Wellness archetype, stability & core traits
 *
 * A living identity profile for the user's digital twin,
 * showing their dominant wellness persona and how stable it is.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";

type WellnessArchetype = "balanced" | "resilient" | "adaptive" | "restorative" | "active" | "mindful";

interface CoreTrait {
  name: string;
  strength: number; // 0–1
  icon: string;
  color: string;
}

interface PhysiologicalIdentityCardProps {
  archetype: WellnessArchetype;
  identityStability: number;     // 0–1 (how consistent the archetype is)
  wellnessAge?: string;          // e.g. "Tracking for 4 months"
  coreTraits: CoreTrait[];
  evolutionNote?: string;        // e.g. "Shifted from Active → Balanced over 6 weeks"
}

const archetypeConfig: Record<WellnessArchetype, { icon: string; color: string; label: string; description: string }> = {
  balanced: { icon: "fa-scale-balanced", color: theme.colors.accent.primary, label: "Balanced", description: "You maintain steady equilibrium between activity and rest" },
  resilient: { icon: "fa-shield-heart", color: theme.colors.health.recovery.DEFAULT, label: "Resilient", description: "You recover quickly from stress and adapt to challenges" },
  adaptive: { icon: "fa-arrows-rotate", color: theme.colors.health.strain.DEFAULT, label: "Adaptive", description: "You naturally adjust routines to fit life's rhythm" },
  restorative: { icon: "fa-spa", color: theme.colors.health.sleep.DEFAULT, label: "Restorative", description: "You prioritize deep rest and mindful recovery" },
  active: { icon: "fa-bolt", color: "#FFB86B", label: "Active", description: "You thrive with movement and energetic engagement" },
  mindful: { icon: "fa-brain", color: "#8B6BFF", label: "Mindful", description: "You excel at emotional awareness and intentional wellness" },
};

export const PhysiologicalIdentityCard = memo(function PhysiologicalIdentityCard({
  archetype,
  identityStability,
  wellnessAge,
  coreTraits,
  evolutionNote,
}: PhysiologicalIdentityCardProps) {
  const cfg = archetypeConfig[archetype];
  const stabilityPct = useInterpolatedMetric(Math.round(identityStability * 100), { duration: 500 });

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Archetype Hero */}
      <div
        className="p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${cfg.color}08 0%, ${theme.colors.surface[2]} 70%)`,
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl"
          style={{ background: `${cfg.color}08` }}
        />

        <div className="flex items-center gap-4 relative z-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}
          >
            <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "1.2rem" }} />
          </div>
          <div>
            <span className="font-black text-lg block" style={{ color: theme.colors.text.primary }}>
              {cfg.label}
            </span>
            <p style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
              {cfg.description}
            </p>
            {wellnessAge && (
              <span className="block mt-1" style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                {wellnessAge}
              </span>
            )}
          </div>
        </div>

        {/* Identity stability */}
        <div className="mt-4 relative z-10">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
              Identity Stability
            </span>
            <span className="font-bold tabular-nums" style={{ fontSize: "0.6rem", color: cfg.color }}>
              {stabilityPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: theme.colors.surface[4] }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: cfg.color }}
              animate={{ width: `${identityStability * 100}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Core traits */}
      <div className="p-5 sm:p-6 space-y-2.5" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
        <span
          className="font-bold uppercase tracking-widest block mb-3"
          style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
        >
          Core Traits
        </span>
        {coreTraits.map((t) => (
          <div key={t.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <i className={`fas ${t.icon}`} style={{ fontSize: "0.5rem", color: t.color }} />
                <span style={{ fontSize: "0.65rem", color: theme.colors.text.muted }}>{t.name}</span>
              </div>
              <span className="font-bold tabular-nums" style={{ fontSize: "0.55rem", color: t.color }}>
                {Math.round(t.strength * 100)}%
              </span>
            </div>
            <div className="h-1 rounded-full" style={{ background: theme.colors.surface[4] }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: t.color }}
                animate={{ width: `${t.strength * 100}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Evolution note */}
      {evolutionNote && (
        <div
          className="px-5 sm:px-6 py-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${theme.colors.border[1]}`, background: theme.colors.surface[1] }}
        >
          <i className="fas fa-timeline" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }} />
          <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
            {evolutionNote}
          </span>
        </div>
      )}
    </motion.div>
  );
});

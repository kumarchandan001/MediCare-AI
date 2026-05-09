/**
 * DigitalTwinOverview — Composition component for the twin experience
 *
 * Combines identity, state visualization, resilience, and adaptations
 * into a cohesive digital twin dashboard section.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface DigitalTwinOverviewProps {
  /** Render the identity card */
  identityCard: React.ReactNode;
  /** Render the state visualizer */
  stateVisualizer: React.ReactNode;
  /** Render the resilience evolution */
  resiliencePanel: React.ReactNode;
  /** Render the behavioral adaptation map */
  adaptationMap: React.ReactNode;
  /** Render the twin memory timeline */
  memoryTimeline: React.ReactNode;
  /** Twin last updated timestamp */
  lastUpdated?: string;
}

export const DigitalTwinOverview = memo(function DigitalTwinOverview({
  identityCard,
  stateVisualizer,
  resiliencePanel,
  adaptationMap,
  memoryTimeline,
  lastUpdated,
}: DigitalTwinOverviewProps) {
  const isMobile = useIsMobile();

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      {/* Twin header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: theme.colors.accent.primary }}
          />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
          >
            Your Digital Twin
          </span>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>

      {/* Identity + State grid */}
      <div className={`grid gap-4 sm:gap-5 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
        <div>{identityCard}</div>
        <div className="flex items-center justify-center">{stateVisualizer}</div>
      </div>

      {/* Resilience */}
      <div
        className="rounded-2xl p-4 sm:p-5 mb-4"
        style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
      >
        {resiliencePanel}
      </div>

      {/* Adaptations + Memory side-by-side (desktop) */}
      <div className={`grid gap-4 sm:gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
        >
          <span
            className="font-bold uppercase tracking-widest block mb-3"
            style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
          >
            Behavioral Adaptations
          </span>
          {adaptationMap}
        </div>
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
        >
          <span
            className="font-bold uppercase tracking-widest block mb-3"
            style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
          >
            Twin Memory
          </span>
          {memoryTimeline}
        </div>
      </div>
    </motion.div>
  );
});

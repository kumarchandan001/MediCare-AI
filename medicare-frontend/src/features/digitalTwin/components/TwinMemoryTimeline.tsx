/**
 * TwinMemoryTimeline — Deep historical memory of the digital twin
 *
 * Tracks recurring wellness patterns, seasonal trends, life adaptations,
 * and resilience milestones. Gives the twin a sense of long-term memory.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem, fadeInUp } from "@/animations";

type MemoryCategory = "adaptation" | "milestone" | "pattern" | "recovery" | "seasonal" | "stabilization";

interface TwinMemory {
  id: string;
  category: MemoryCategory;
  title: string;
  description: string;
  date: string;
  significance: "minor" | "notable" | "major";
}

interface TwinMemoryTimelineProps {
  memories: TwinMemory[];
  maxVisible?: number;
}

const categoryConfig: Record<MemoryCategory, { icon: string; color: string }> = {
  adaptation: { icon: "fa-arrows-rotate", color: theme.colors.health.strain.DEFAULT },
  milestone: { icon: "fa-trophy", color: "#FFB86B" },
  pattern: { icon: "fa-chart-line", color: theme.colors.accent.primary },
  recovery: { icon: "fa-heart-circle-check", color: theme.colors.health.recovery.DEFAULT },
  seasonal: { icon: "fa-cloud-sun", color: theme.colors.health.sleep.DEFAULT },
  stabilization: { icon: "fa-shield-halved", color: "#8B6BFF" },
};

const significanceDot: Record<string, { size: string; ring: boolean }> = {
  minor: { size: "w-2 h-2", ring: false },
  notable: { size: "w-2.5 h-2.5", ring: false },
  major: { size: "w-3 h-3", ring: true },
};

export const TwinMemoryTimeline = memo(function TwinMemoryTimeline({
  memories,
  maxVisible = 8,
}: TwinMemoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? memories : memories.slice(0, maxVisible);

  if (memories.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-brain text-sm mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          Your twin's memory is growing — experiences are being recorded.
        </span>
      </div>
    );
  }

  return (
    <div>
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px"
          style={{ background: theme.colors.border[2] }}
        />

        <div className="space-y-3">
          <AnimatePresence>
            {visible.map((mem) => {
              const cat = categoryConfig[mem.category];
              const sig = significanceDot[mem.significance];

              return (
                <motion.div
                  key={mem.id}
                  variants={staggerItem}
                  className="flex items-start gap-3 pl-0 relative"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: "15px" }}>
                    <div
                      className={`${sig.size} rounded-full`}
                      style={{
                        background: cat.color,
                        boxShadow: sig.ring ? `0 0 0 3px ${cat.color}20` : "none",
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div
                    className="flex-1 rounded-xl p-3"
                    style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <i className={`fas ${cat.icon}`} style={{ fontSize: "0.5rem", color: cat.color }} />
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                        {mem.title}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.65rem", color: theme.colors.text.muted, lineHeight: 1.4 }}>
                      {mem.description}
                    </p>
                    <span className="block mt-1" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                      {mem.date}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Show more */}
      {memories.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-2 mt-2 text-xs font-semibold rounded-lg transition-colors"
          style={{ color: theme.colors.accent.primary }}
        >
          {showAll ? "Show less" : `Show ${memories.length - maxVisible} more memories`}
        </button>
      )}
    </div>
  );
});

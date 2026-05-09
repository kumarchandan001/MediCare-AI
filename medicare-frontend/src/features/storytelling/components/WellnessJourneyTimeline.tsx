/**
 * WellnessJourneyTimeline — Master wellness journey narrative
 *
 * A cinematic, emotionally intelligent timeline that tells the
 * story of the user's wellness evolution using supportive prose.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

type JourneyEventType = "milestone" | "recovery" | "challenge" | "growth" | "stabilization" | "seasonal";

interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  title: string;
  narrative: string;       // human-written prose
  date: string;
  significance: "minor" | "notable" | "major" | "landmark";
  emoji?: string;
}

interface WellnessJourneyTimelineProps {
  events: JourneyEvent[];
  maxVisible?: number;
}

const eventConfig: Record<JourneyEventType, { icon: string; color: string }> = {
  milestone: { icon: "fa-flag", color: "#FFB86B" },
  recovery: { icon: "fa-heart-circle-check", color: theme.colors.health.recovery.DEFAULT },
  challenge: { icon: "fa-mountain", color: theme.colors.health.warning.DEFAULT },
  growth: { icon: "fa-arrow-trend-up", color: theme.colors.accent.primary },
  stabilization: { icon: "fa-shield-halved", color: "#8B6BFF" },
  seasonal: { icon: "fa-cloud-sun", color: theme.colors.health.sleep.DEFAULT },
};

const significanceSize: Record<string, { dot: string; text: string }> = {
  minor: { dot: "w-2.5 h-2.5", text: "text-xs" },
  notable: { dot: "w-3 h-3", text: "text-xs" },
  major: { dot: "w-3.5 h-3.5", text: "text-sm" },
  landmark: { dot: "w-4 h-4", text: "text-sm font-bold" },
};

export const WellnessJourneyTimeline = memo(function WellnessJourneyTimeline({
  events,
  maxVisible = 6,
}: WellnessJourneyTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? events : events.slice(0, maxVisible);

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-road text-lg mb-3 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.75rem", color: theme.colors.text.subtle }}>
          Your wellness journey is just beginning.
        </span>
        <p className="mt-1" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
          We'll capture meaningful moments as they happen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="relative">
        {/* Central vertical line */}
        <div
          className="absolute left-[11px] sm:left-[13px] top-2 bottom-2 w-px"
          style={{ background: theme.colors.border[2] }}
        />

        <div className="space-y-4">
          <AnimatePresence>
            {visible.map((event) => {
              const cfg = eventConfig[event.type];
              const sig = significanceSize[event.significance];

              return (
                <motion.div
                  key={event.id}
                  variants={staggerItem}
                  className="flex items-start gap-3 sm:gap-4 relative"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: "24px" }}>
                    <div
                      className={`${sig.dot} rounded-full flex items-center justify-center`}
                      style={{
                        background: cfg.color,
                        boxShadow: event.significance === "landmark" ? `0 0 12px ${cfg.color}40` : "none",
                      }}
                    >
                      {event.emoji ? (
                        <span style={{ fontSize: "0.5rem" }}>{event.emoji}</span>
                      ) : (
                        <i className={`fas ${cfg.icon}`} style={{ fontSize: "0.3rem", color: "#fff" }} />
                      )}
                    </div>
                  </div>

                  {/* Event content */}
                  <div
                    className="flex-1 rounded-xl p-3.5"
                    style={{
                      background: event.significance === "landmark" ? `${cfg.color}06` : theme.colors.surface[3],
                      border: `1px solid ${event.significance === "landmark" ? `${cfg.color}15` : theme.colors.border[1]}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={sig.text} style={{ color: theme.colors.text.primary }}>
                        {event.title}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.55 }}>
                      {event.narrative}
                    </p>
                    <span className="block mt-1.5" style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                      {event.date}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {events.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-3 mt-3 text-xs font-semibold rounded-xl transition-colors"
          style={{ color: theme.colors.accent.primary, background: theme.colors.surface[3] }}
        >
          {showAll ? "Show recent" : `Explore ${events.length - maxVisible} more moments`}
        </button>
      )}
    </div>
  );
});

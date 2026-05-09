/**
 * LiveSessionBanner — Active session UX banner
 * 
 * Displays active workout/recovery/sleep/stress monitoring sessions
 * with duration timer and physiological state.
 */
import React, { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInDown } from "@/animations";

type SessionType = "workout" | "recovery" | "sleep" | "stress_monitoring";

interface LiveSessionBannerProps {
  active: boolean;
  sessionType?: SessionType;
  startedAt?: string;
  intensity?: "low" | "moderate" | "high";
  currentPhase?: string;
  onEnd?: () => void;
}

const sessionConfig: Record<SessionType, { color: string; icon: string; label: string }> = {
  workout: { color: theme.colors.health.strain.DEFAULT, icon: "fa-person-running", label: "Workout" },
  recovery: { color: theme.colors.health.recovery.DEFAULT, icon: "fa-heart-circle-check", label: "Recovery" },
  sleep: { color: theme.colors.health.sleep.DEFAULT, icon: "fa-moon", label: "Sleep Tracking" },
  stress_monitoring: { color: theme.colors.health.warning.DEFAULT, icon: "fa-brain", label: "Stress Monitor" },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const LiveSessionBanner = memo(function LiveSessionBanner({
  active,
  sessionType = "workout",
  startedAt,
  intensity = "moderate",
  currentPhase,
  onEnd,
}: LiveSessionBannerProps) {
  const [elapsed, setElapsed] = useState(0);
  const config = sessionConfig[sessionType];

  useEffect(() => {
    if (!active || !startedAt) {
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          variants={fadeInDown}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
          className="rounded-xl px-4 py-3 sm:px-5 sm:py-4 mb-4 flex items-center gap-3"
          style={{
            background: `${config.color}08`,
            border: `1px solid ${config.color}25`,
          }}
        >
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${config.color}18` }}
          >
            <i className={`fas ${config.icon}`} style={{ color: config.color, fontSize: "0.85rem" }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: config.color }}>
                {config.label}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-bold uppercase"
                style={{
                  background: `${config.color}15`,
                  color: config.color,
                  fontSize: "0.5rem",
                  letterSpacing: "0.06em",
                }}
              >
                {intensity}
              </span>
              <span className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
            </div>
            {currentPhase && (
              <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
                {currentPhase}
              </span>
            )}
          </div>

          {/* Timer */}
          <span
            className="font-mono font-bold tabular-nums shrink-0"
            style={{ fontSize: "1.1rem", color: config.color }}
          >
            {formatDuration(elapsed)}
          </span>

          {/* End button */}
          {onEnd && (
            <button
              onClick={onEnd}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-1"
              style={{
                background: `${theme.colors.health.danger.DEFAULT}15`,
                color: theme.colors.health.danger.DEFAULT,
              }}
            >
              <i className="fas fa-stop text-xs" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * LiveSyncTimeline — Visual timeline of streaming data ingestion
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";

interface SyncEvent {
  id: string;
  type: "heartRate" | "steps" | "sleep" | "stress" | "spo2" | "activity" | "sync";
  timestamp: string;
  status: "success" | "warning" | "error";
  dataPoints?: number;
}

interface LiveSyncTimelineProps {
  events: SyncEvent[];
  maxVisible?: number;
}

const eventConfig: Record<string, { icon: string; color: string }> = {
  heartRate: { icon: "fa-heart-pulse", color: "#FF6B8A" },
  steps: { icon: "fa-person-walking", color: theme.colors.health.strain.DEFAULT },
  sleep: { icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT },
  stress: { icon: "fa-brain", color: theme.colors.health.warning.DEFAULT },
  spo2: { icon: "fa-lungs", color: "#6BB8FF" },
  activity: { icon: "fa-dumbbell", color: theme.colors.accent.primary },
  sync: { icon: "fa-rotate", color: theme.colors.text.muted },
};

const statusDot: Record<string, string> = {
  success: theme.colors.health.recovery.DEFAULT,
  warning: theme.colors.health.warning.DEFAULT,
  error: theme.colors.health.danger.DEFAULT,
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}

export const LiveSyncTimeline = memo(function LiveSyncTimeline({
  events,
  maxVisible = 8,
}: LiveSyncTimelineProps) {
  const visible = events.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div className="text-center py-4">
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          No sync activity yet
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-1">
      {visible.map((event, i) => {
        const cfg = eventConfig[event.type] || eventConfig.sync;
        return (
          <motion.div
            key={event.id}
            variants={staggerItem}
            className="flex items-center gap-2.5 py-1.5"
          >
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center shrink-0" style={{ width: "12px" }}>
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: statusDot[event.status] }}
              />
              {i < visible.length - 1 && (
                <div className="w-px flex-1 min-h-[12px]" style={{ background: theme.colors.border[1] }} />
              )}
            </div>

            {/* Icon */}
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${cfg.color}10` }}
            >
              <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "0.5rem" }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-xs truncate" style={{ color: theme.colors.text.muted }}>
                {event.type.replace(/([A-Z])/g, " $1").trim()}
                {event.dataPoints ? ` · ${event.dataPoints} pts` : ""}
              </span>
              <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle, flexShrink: 0 }}>
                {formatTime(event.timestamp)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

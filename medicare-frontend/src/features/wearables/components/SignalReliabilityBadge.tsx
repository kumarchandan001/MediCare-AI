/**
 * SignalReliabilityBadge — Wearable stream quality indicator
 * 
 * Displays signal quality, latency, and freshness in a compact badge.
 * Colors adapt to signal state: green (excellent) → yellow (degraded) → red (lost).
 */
import React, { memo } from "react";
import { theme } from "@/config/theme";
import { useDataFreshness } from "@/hooks/useStreamSafety";
import type { DataFreshness } from "@/hooks/useStreamSafety";

type SignalQuality = "excellent" | "good" | "degraded" | "poor" | "lost";

interface SignalReliabilityBadgeProps {
  quality: SignalQuality;
  latencyMs?: number;
  lastUpdated?: string | null;
  showLabel?: boolean;
  compact?: boolean;
}

const qualityConfig: Record<SignalQuality, { color: string; label: string; bars: number }> = {
  excellent: { color: theme.colors.health.recovery.DEFAULT, label: "Excellent", bars: 4 },
  good: { color: theme.colors.accent.primary, label: "Good", bars: 3 },
  degraded: { color: theme.colors.health.warning.DEFAULT, label: "Degraded", bars: 2 },
  poor: { color: "#FF8C42", label: "Poor", bars: 1 },
  lost: { color: theme.colors.health.danger.DEFAULT, label: "No Signal", bars: 0 },
};

export const SignalReliabilityBadge = memo(function SignalReliabilityBadge({
  quality,
  latencyMs,
  lastUpdated,
  showLabel = true,
  compact = false,
}: SignalReliabilityBadgeProps) {
  const config = qualityConfig[quality];
  const { freshness, ageLabel } = useDataFreshness(lastUpdated ?? null);

  return (
    <div className="flex items-center gap-2">
      {/* Signal bars */}
      <div className="flex items-end gap-0.5" style={{ height: compact ? "10px" : "12px" }}>
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className="rounded-sm transition-colors duration-300"
            style={{
              width: compact ? "2px" : "3px",
              height: `${bar * (compact ? 2.5 : 3)}px`,
              background: bar <= config.bars ? config.color : theme.colors.surface[5],
            }}
          />
        ))}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className="font-bold uppercase tracking-wider"
          style={{ fontSize: "0.5rem", color: config.color }}
        >
          {config.label}
        </span>
      )}

      {/* Latency */}
      {latencyMs !== undefined && !compact && (
        <span
          className="px-1.5 py-0.5 rounded"
          style={{
            fontSize: "0.5rem",
            color: theme.colors.text.subtle,
            background: theme.colors.surface[3],
          }}
        >
          {latencyMs}ms
        </span>
      )}

      {/* Freshness dot */}
      {lastUpdated && !compact && (
        <div className="flex items-center gap-1">
          <div
            className="w-1 h-1 rounded-full"
            style={{
              background:
                freshness === "live" ? theme.colors.health.recovery.DEFAULT :
                freshness === "recent" ? theme.colors.accent.primary :
                freshness === "stale" ? theme.colors.health.warning.DEFAULT :
                theme.colors.health.danger.DEFAULT,
            }}
          />
          <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
            {ageLabel}
          </span>
        </div>
      )}
    </div>
  );
});

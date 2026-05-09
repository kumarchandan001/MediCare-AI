/**
 * LiveVitalsPanel — High-frequency vital signs display
 * 
 * Renders HR, SpO2, respiratory rate, and body temp with
 * smooth interpolation and throttled updates. Feels alive
 * without being noisy or jittery.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { useDataFreshness } from "@/hooks/useStreamSafety";
import { fadeInUp, staggerContainer, staggerItem, pulseVariant } from "@/animations";

interface VitalReading {
  value: number;
  unit: string;
  trend?: "up" | "down" | "stable";
  normal_range?: [number, number];
}

interface LiveVitalsPanelProps {
  heartRate?: VitalReading;
  spO2?: VitalReading;
  respiratoryRate?: VitalReading;
  bodyTemp?: VitalReading;
  lastUpdated?: string | null;
  isLive?: boolean;
  compact?: boolean;
}

// ── Single Vital Tile ────────────────────────
const VitalTile = memo(function VitalTile({
  label,
  icon,
  color,
  reading,
  isLive,
  compact,
}: {
  label: string;
  icon: string;
  color: string;
  reading?: VitalReading;
  isLive: boolean;
  compact: boolean;
}) {
  const interpolated = useInterpolatedMetric(reading?.value ?? 0, {
    duration: 400,
    precision: label === "SpO2" || label === "Temp" ? 1 : 0,
  });

  const inRange =
    reading?.normal_range &&
    reading.value >= reading.normal_range[0] &&
    reading.value <= reading.normal_range[1];

  const statusColor = inRange === false
    ? theme.colors.health.warning.DEFAULT
    : color;

  const trendIcon =
    reading?.trend === "up"
      ? "fa-caret-up"
      : reading?.trend === "down"
      ? "fa-caret-down"
      : null;

  return (
    <motion.div
      variants={staggerItem}
      className={`rounded-xl overflow-hidden ${compact ? "p-3" : "p-4"}`}
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `${color}12` }}
          >
            <i className={`fas ${icon}`} style={{ color, fontSize: "0.6rem" }} />
          </div>
          <span
            className="font-bold uppercase tracking-wider"
            style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
          >
            {label}
          </span>
        </div>
        {isLive && (
          <motion.div
            variants={pulseVariant}
            initial="initial"
            animate="animate"
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: theme.colors.health.recovery.DEFAULT }}
          />
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className="font-black tabular-nums"
          style={{
            fontSize: compact ? "1.4rem" : "1.75rem",
            color: statusColor,
            lineHeight: 1,
          }}
        >
          {interpolated}
        </span>
        <span
          className="font-medium"
          style={{ fontSize: "0.7rem", color: theme.colors.text.subtle }}
        >
          {reading?.unit}
        </span>
        {trendIcon && (
          <i
            className={`fas ${trendIcon}`}
            style={{
              fontSize: "0.7rem",
              color:
                reading?.trend === "up"
                  ? theme.colors.health.danger.DEFAULT
                  : theme.colors.health.recovery.DEFAULT,
              marginLeft: "2px",
            }}
          />
        )}
      </div>

      {/* Range indicator */}
      {reading?.normal_range && (
        <div className="mt-2 flex items-center gap-1.5">
          <div
            className="w-1 h-1 rounded-full"
            style={{
              background: inRange
                ? theme.colors.health.recovery.DEFAULT
                : theme.colors.health.warning.DEFAULT,
            }}
          />
          <span
            style={{
              fontSize: "0.55rem",
              color: theme.colors.text.subtle,
            }}
          >
            {reading.normal_range[0]}–{reading.normal_range[1]} {reading.unit}
          </span>
        </div>
      )}
    </motion.div>
  );
});

// ── Main Panel ───────────────────────────────
export const LiveVitalsPanel = memo(function LiveVitalsPanel({
  heartRate,
  spO2,
  respiratoryRate,
  bodyTemp,
  lastUpdated = null,
  isLive = false,
  compact = false,
}: LiveVitalsPanelProps) {
  const { freshness, ageLabel } = useDataFreshness(lastUpdated, { maxAge: 30_000 });

  const freshnessColor =
    freshness === "live"
      ? theme.colors.health.recovery.DEFAULT
      : freshness === "recent"
      ? theme.colors.accent.primary
      : freshness === "stale"
      ? theme.colors.health.warning.DEFAULT
      : theme.colors.text.subtle;

  return (
    <div>
      {/* Freshness indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: freshnessColor }}
          />
          <span
            className="font-bold uppercase tracking-wider"
            style={{ fontSize: "0.55rem", color: freshnessColor }}
          >
            {freshness === "live" ? "Live" : freshness === "recent" ? "Recent" : freshness === "stale" ? "Stale Data" : "No Signal"}
          </span>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
            {ageLabel}
          </span>
        )}
      </div>

      {/* Vitals Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}
      >
        <VitalTile
          label="Heart Rate"
          icon="fa-heart-pulse"
          color="#FF6B8A"
          reading={heartRate ?? { value: 0, unit: "bpm", normal_range: [60, 100] }}
          isLive={isLive}
          compact={compact}
        />
        <VitalTile
          label="SpO2"
          icon="fa-lungs"
          color="#6BB8FF"
          reading={spO2 ?? { value: 0, unit: "%", normal_range: [95, 100] }}
          isLive={isLive}
          compact={compact}
        />
        <VitalTile
          label="Resp Rate"
          icon="fa-wind"
          color="#8B6BFF"
          reading={respiratoryRate ?? { value: 0, unit: "brpm", normal_range: [12, 20] }}
          isLive={isLive}
          compact={compact}
        />
        <VitalTile
          label="Temp"
          icon="fa-temperature-half"
          color="#FFB86B"
          reading={bodyTemp ?? { value: 0, unit: "°F", normal_range: [97, 99] }}
          isLive={isLive}
          compact={compact}
        />
      </motion.div>
    </div>
  );
});

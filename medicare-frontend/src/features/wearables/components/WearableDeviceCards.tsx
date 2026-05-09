/**
 * WearableDeviceCards — Device health, battery, and sync latency cards
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem } from "@/animations";
import { SignalReliabilityBadge } from "./SignalReliabilityBadge";

interface DeviceInfo {
  id: string;
  name: string;
  model?: string;
  battery?: number;
  firmwareVersion?: string;
  signalQuality: "excellent" | "good" | "degraded" | "poor" | "lost";
  lastSync?: string;
  latencyMs?: number;
  activeSensors: string[];
}

interface WearableDeviceCardsProps {
  devices: DeviceInfo[];
  compact?: boolean;
}

function batteryIcon(level: number): string {
  if (level > 75) return "fa-battery-full";
  if (level > 50) return "fa-battery-three-quarters";
  if (level > 25) return "fa-battery-half";
  if (level > 10) return "fa-battery-quarter";
  return "fa-battery-empty";
}

function batteryColor(level: number): string {
  if (level > 50) return theme.colors.health.recovery.DEFAULT;
  if (level > 20) return theme.colors.health.warning.DEFAULT;
  return theme.colors.health.danger.DEFAULT;
}

export const WearableDeviceCards = memo(function WearableDeviceCards({
  devices,
  compact = false,
}: WearableDeviceCardsProps) {
  if (devices.length === 0) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-watch text-lg mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span className="text-xs" style={{ color: theme.colors.text.subtle }}>No devices paired</span>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {devices.map((device) => (
        <motion.div
          key={device.id}
          variants={staggerItem}
          className="rounded-xl p-3 sm:p-4"
          style={{
            background: theme.colors.surface[3],
            border: `1px solid ${theme.colors.border[1]}`,
          }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${theme.colors.accent.primary}12` }}
              >
                <i className="fas fa-watch" style={{ color: theme.colors.accent.primary, fontSize: "0.7rem" }} />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs block truncate" style={{ color: theme.colors.text.primary }}>
                  {device.name}
                </span>
                {device.model && (
                  <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>{device.model}</span>
                )}
              </div>
            </div>

            {/* Battery */}
            {device.battery !== undefined && (
              <div className="flex items-center gap-1.5 shrink-0">
                <i
                  className={`fas ${batteryIcon(device.battery)}`}
                  style={{ fontSize: "0.65rem", color: batteryColor(device.battery) }}
                />
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: "0.6rem", color: batteryColor(device.battery) }}
                >
                  {device.battery}%
                </span>
              </div>
            )}
          </div>

          {/* Signal */}
          <div className="mb-2">
            <SignalReliabilityBadge
              quality={device.signalQuality}
              latencyMs={device.latencyMs}
              lastUpdated={device.lastSync}
            />
          </div>

          {/* Active sensors */}
          {device.activeSensors.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {device.activeSensors.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "0.5rem",
                    color: theme.colors.text.muted,
                    background: theme.colors.surface[2],
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
});

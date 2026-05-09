/**
 * WearableConnectionCenter — Hub for managing wearable connections
 * 
 * Shows connected devices, sync activity, and connection actions.
 */
import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp, staggerContainer, staggerItem } from "@/animations";
import { SignalReliabilityBadge } from "./SignalReliabilityBadge";
import { SyncHealthIndicator } from "./SyncHealthIndicator";

interface WearableDevice {
  id: string;
  name: string;
  provider: "google_fit" | "health_connect" | "apple_health" | "other";
  connected: boolean;
  lastSync?: string;
  battery?: number;
  signalQuality: "excellent" | "good" | "degraded" | "poor" | "lost";
  syncState: "syncing" | "synced" | "paused" | "error" | "offline";
  sensors: string[];
}

interface WearableConnectionCenterProps {
  devices: WearableDevice[];
  onConnect?: (provider: string) => void;
  onDisconnect?: (deviceId: string) => void;
  compact?: boolean;
}

const providerIcons: Record<string, { icon: string; color: string; label: string }> = {
  google_fit: { icon: "fa-heart", color: "#4285F4", label: "Google Fit" },
  health_connect: { icon: "fa-mobile-screen-button", color: "#34A853", label: "Health Connect" },
  apple_health: { icon: "fa-apple", color: "#FF2D55", label: "Apple Health" },
  other: { icon: "fa-plug", color: theme.colors.accent.primary, label: "Device" },
};

export const WearableConnectionCenter = memo(function WearableConnectionCenter({
  devices,
  onConnect,
  onDisconnect,
  compact = false,
}: WearableConnectionCenterProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const connectedCount = devices.filter((d) => d.connected).length;

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: connectedCount > 0
                ? `${theme.colors.health.recovery.DEFAULT}15`
                : `${theme.colors.text.subtle}15`,
            }}
          >
            <i
              className="fas fa-link text-xs"
              style={{
                color: connectedCount > 0
                  ? theme.colors.health.recovery.DEFAULT
                  : theme.colors.text.subtle,
              }}
            />
          </div>
          <div>
            <span className="text-xs font-semibold block" style={{ color: theme.colors.text.primary }}>
              {connectedCount} Device{connectedCount !== 1 ? "s" : ""} Connected
            </span>
            <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
              {connectedCount === 0 ? "Connect a wearable to begin" : "Live data streaming"}
            </span>
          </div>
        </div>
      </div>

      {/* Device List */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {devices.map((device) => {
          const provider = providerIcons[device.provider] || providerIcons.other;
          const isExpanded = expanded === device.id;

          return (
            <motion.div
              key={device.id}
              variants={staggerItem}
              className="rounded-xl overflow-hidden"
              style={{
                background: theme.colors.surface[3],
                border: `1px solid ${device.connected ? `${provider.color}20` : theme.colors.border[1]}`,
              }}
            >
              {/* Device Header */}
              <button
                className="w-full text-left p-3 flex items-center gap-3"
                onClick={() => setExpanded(isExpanded ? null : device.id)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${provider.color}15` }}
                >
                  <i className={`fas ${provider.icon}`} style={{ color: provider.color, fontSize: "0.7rem" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                      {device.name || provider.label}
                    </span>
                    <SignalReliabilityBadge quality={device.signalQuality} compact showLabel={false} />
                  </div>
                  <SyncHealthIndicator state={device.syncState} compact />
                </div>

                {/* Battery */}
                {device.battery !== undefined && (
                  <div className="flex items-center gap-1 shrink-0">
                    <i
                      className={`fas ${device.battery > 50 ? "fa-battery-three-quarters" : device.battery > 20 ? "fa-battery-half" : "fa-battery-quarter"}`}
                      style={{
                        fontSize: "0.6rem",
                        color: device.battery > 20 ? theme.colors.text.subtle : theme.colors.health.danger.DEFAULT,
                      }}
                    />
                    <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                      {device.battery}%
                    </span>
                  </div>
                )}

                <motion.i
                  className="fas fa-chevron-down text-xs shrink-0"
                  style={{ color: theme.colors.text.subtle }}
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-0" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                      <div className="pt-3">
                        {/* Signal Details */}
                        <div className="mb-2">
                          <SignalReliabilityBadge
                            quality={device.signalQuality}
                            lastUpdated={device.lastSync}
                            latencyMs={device.connected ? 120 : undefined}
                          />
                        </div>

                        {/* Sensors */}
                        {device.sensors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {device.sensors.map((sensor) => (
                              <span
                                key={sensor}
                                className="px-2 py-0.5 rounded-md"
                                style={{
                                  fontSize: "0.55rem",
                                  color: theme.colors.text.muted,
                                  background: theme.colors.surface[2],
                                }}
                              >
                                {sensor}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {device.connected && onDisconnect && (
                          <button
                            onClick={() => onDisconnect(device.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: `${theme.colors.health.danger.DEFAULT}10`,
                              color: theme.colors.health.danger.DEFAULT,
                              border: `1px solid ${theme.colors.health.danger.DEFAULT}25`,
                            }}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Connect button */}
      {onConnect && (
        <button
          onClick={() => onConnect("google_fit")}
          className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          style={{
            background: theme.colors.surface[3],
            border: `1px dashed ${theme.colors.border[2]}`,
            color: theme.colors.text.muted,
          }}
        >
          <i className="fas fa-plus text-xs" />
          Connect Wearable
        </button>
      )}
    </div>
  );
});

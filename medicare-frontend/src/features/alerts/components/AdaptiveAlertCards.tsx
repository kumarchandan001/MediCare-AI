/**
 * AdaptiveAlertCards — Auto-grouping, cooldown-aware alert system
 * 
 * Groups similar alerts, suppresses low-priority noise, and visualizes
 * cooldown periods. Designed to feel supportive, not stressful.
 */
import React, { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { staggerContainer, staggerItem, fadeInLeft } from "@/animations";

type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

interface AdaptiveAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: string;
  timestamp: string;
  reasoning?: string;
  cooldownUntil?: string;
  groupKey?: string;
}

interface AdaptiveAlertCardsProps {
  alerts: AdaptiveAlert[];
  maxVisible?: number;
  suppressLowPriority?: boolean;
  onDismiss?: (id: string) => void;
  onDismissGroup?: (groupKey: string) => void;
}

const severityConfig: Record<AlertSeverity, { color: string; bg: string; border: string; icon: string; priority: number }> = {
  critical: { color: theme.colors.health.danger.DEFAULT, bg: theme.colors.health.danger.bg, border: theme.colors.health.danger.border, icon: "fa-circle-exclamation", priority: 5 },
  high: { color: "#FF8C42", bg: "rgba(255,140,66,0.06)", border: "rgba(255,140,66,0.15)", icon: "fa-triangle-exclamation", priority: 4 },
  medium: { color: theme.colors.health.warning.DEFAULT, bg: theme.colors.health.warning.bg, border: theme.colors.health.warning.border, icon: "fa-bell", priority: 3 },
  low: { color: theme.colors.accent.primary, bg: theme.colors.accent.subtle, border: `${theme.colors.accent.primary}20`, icon: "fa-circle-info", priority: 2 },
  info: { color: theme.colors.text.muted, bg: theme.colors.surface[3], border: theme.colors.border[1], icon: "fa-info", priority: 1 },
};

interface AlertGroup {
  key: string;
  alerts: AdaptiveAlert[];
  severity: AlertSeverity;
  category: string;
}

function groupAlerts(alerts: AdaptiveAlert[]): AlertGroup[] {
  const groups = new Map<string, AdaptiveAlert[]>();

  for (const alert of alerts) {
    const key = alert.groupKey || `${alert.category}-${alert.severity}`;
    const existing = groups.get(key) || [];
    existing.push(alert);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    alerts: items,
    severity: items[0].severity,
    category: items[0].category,
  }));
}

export const AdaptiveAlertCards = memo(function AdaptiveAlertCards({
  alerts,
  maxVisible = 5,
  suppressLowPriority = true,
  onDismiss,
  onDismissGroup,
}: AdaptiveAlertCardsProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const processed = useMemo(() => {
    let filtered = alerts;

    // Filter expired cooldowns
    const now = Date.now();
    filtered = filtered.filter((a) => {
      if (!a.cooldownUntil) return true;
      return new Date(a.cooldownUntil).getTime() > now;
    });

    // Suppress low-priority if enabled
    if (suppressLowPriority && filtered.length > 3) {
      const hasCritical = filtered.some((a) => a.severity === "critical" || a.severity === "high");
      if (hasCritical) {
        filtered = filtered.filter((a) => a.severity !== "info" && a.severity !== "low");
      }
    }

    // Sort by severity
    filtered.sort((a, b) => severityConfig[b.severity].priority - severityConfig[a.severity].priority);

    return groupAlerts(filtered).slice(0, maxVisible);
  }, [alerts, maxVisible, suppressLowPriority]);

  if (processed.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3">
        <i className="fas fa-shield-check text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
        <span style={{ fontSize: "0.7rem", color: theme.colors.text.subtle }}>
          No active alerts — you're doing well
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
      {processed.map((group) => {
        const config = severityConfig[group.severity];
        const isGrouped = group.alerts.length > 1;
        const isExpanded = expandedGroup === group.key;
        const primary = group.alerts[0];

        return (
          <motion.div
            key={group.key}
            variants={staggerItem}
            className="rounded-xl overflow-hidden"
            style={{ background: config.bg, border: `1px solid ${config.border}` }}
          >
            {/* Primary alert */}
            <div
              className="p-3 flex items-start gap-2.5 cursor-pointer"
              onClick={() => isGrouped && setExpandedGroup(isExpanded ? null : group.key)}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${config.color}18` }}
              >
                <i className={`fas ${config.icon}`} style={{ color: config.color, fontSize: "0.6rem" }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-xs" style={{ color: config.color }}>
                    {primary.title}
                  </span>
                  {isGrouped && (
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: `${config.color}18`, color: config.color, fontSize: "0.5rem" }}
                    >
                      +{group.alerts.length - 1}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: theme.colors.text.muted }}>
                  {primary.message}
                </p>
                {primary.reasoning && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <i className="fas fa-sparkles mt-0.5" style={{ color: config.color, fontSize: "0.5rem" }} />
                    <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, lineHeight: 1.3 }}>
                      {primary.reasoning}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onDismiss && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(primary.id); }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ color: theme.colors.text.subtle }}
                  >
                    <i className="fas fa-xmark text-xs" />
                  </button>
                )}
                {isGrouped && (
                  <motion.i
                    className="fas fa-chevron-down text-xs"
                    style={{ color: theme.colors.text.subtle }}
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </div>
            </div>

            {/* Grouped alerts expanded */}
            <AnimatePresence>
              {isExpanded && isGrouped && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div style={{ borderTop: `1px solid ${config.border}` }}>
                    {group.alerts.slice(1).map((alert) => (
                      <div key={alert.id} className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${config.border}` }}>
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ background: config.color }} />
                        <span className="text-xs flex-1" style={{ color: theme.colors.text.muted }}>{alert.message}</span>
                        {onDismiss && (
                          <button onClick={() => onDismiss(alert.id)} className="shrink-0" style={{ color: theme.colors.text.subtle }}>
                            <i className="fas fa-xmark" style={{ fontSize: "0.55rem" }} />
                          </button>
                        )}
                      </div>
                    ))}
                    {onDismissGroup && (
                      <button
                        onClick={() => onDismissGroup(group.key)}
                        className="w-full text-center py-2 text-xs font-semibold"
                        style={{ color: theme.colors.text.subtle }}
                      >
                        Dismiss all {group.alerts.length}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

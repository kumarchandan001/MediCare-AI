/**
 * StreamingInsightCards — Explainable AI insights with live confidence
 * 
 * Updates based on live physiological context. Shows reasoning chains
 * in human-centric, non-technical language.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInterpolatedMetric } from "@/hooks/useInterpolatedMetric";
import { staggerContainer, staggerItem } from "@/animations";

interface StreamingInsight {
  id: string;
  title: string;
  summary: string;
  confidence: number;            // 0–1
  category: "pattern" | "risk" | "improvement" | "milestone" | "context";
  reasoning?: string[];
  dataSource?: string;
  isLive?: boolean;
}

interface StreamingInsightCardsProps {
  insights: StreamingInsight[];
  maxVisible?: number;
  compact?: boolean;
}

const categoryConfig: Record<string, { icon: string; color: string }> = {
  pattern: { icon: "fa-chart-line", color: theme.colors.accent.primary },
  risk: { icon: "fa-shield-exclamation", color: theme.colors.health.warning.DEFAULT },
  improvement: { icon: "fa-arrow-trend-up", color: theme.colors.health.recovery.DEFAULT },
  milestone: { icon: "fa-trophy", color: "#FFB86B" },
  context: { icon: "fa-circle-info", color: theme.colors.health.strain.DEFAULT },
};

const ConfidenceBar = memo(function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const interp = useInterpolatedMetric(Math.round(value * 100), { duration: 400 });

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1 rounded-full" style={{ background: theme.colors.surface[4] }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span className="font-bold tabular-nums" style={{ fontSize: "0.5rem", color }}>
        {interp}%
      </span>
    </div>
  );
});

export const StreamingInsightCards = memo(function StreamingInsightCards({
  insights,
  maxVisible = 4,
  compact = false,
}: StreamingInsightCardsProps) {
  const visible = insights.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-brain text-sm mb-2 block" style={{ color: theme.colors.text.subtle }} />
        <span style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
          Intelligence is analyzing your data…
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
      {visible.map((insight) => {
        const cfg = categoryConfig[insight.category] || categoryConfig.context;

        return (
          <motion.div
            key={insight.id}
            variants={staggerItem}
            className={`rounded-xl ${compact ? "p-2.5" : "p-3"}`}
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${theme.colors.border[1]}`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${cfg.color}10` }}
              >
                <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: "0.6rem" }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-xs" style={{ color: theme.colors.text.primary }}>
                    {insight.title}
                  </span>
                  {insight.isLive && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.colors.health.recovery.DEFAULT }} />
                  )}
                </div>

                <p style={{ fontSize: "0.7rem", color: theme.colors.text.muted, lineHeight: 1.45 }}>
                  {insight.summary}
                </p>

                {/* Confidence + Source */}
                <div className="flex items-center gap-3 mt-1.5">
                  <ConfidenceBar value={insight.confidence} color={cfg.color} />
                  {insight.dataSource && (
                    <span style={{ fontSize: "0.5rem", color: theme.colors.text.subtle }}>
                      via {insight.dataSource}
                    </span>
                  )}
                </div>

                {/* Reasoning chain */}
                {insight.reasoning && insight.reasoning.length > 0 && !compact && (
                  <div className="mt-2 space-y-1">
                    {insight.reasoning.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: cfg.color }} />
                        <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, lineHeight: 1.3 }}>
                          {r}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

/**
 * IntelligencePanel — Expandable insight/explanation panel
 * For frontend explainability foundation.
 */
import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface IntelligencePanelProps {
  title: string;
  icon?: string;
  iconColor?: string;
  confidence?: number;
  summary: string;
  explanation?: string;
  reasoning?: string[];
  source?: string;
  type?: "insight" | "recommendation" | "warning" | "positive";
}

const typeColors = {
  insight: theme.colors.health.strain.DEFAULT,
  recommendation: theme.colors.accent.primary,
  warning: theme.colors.health.warning.DEFAULT,
  positive: theme.colors.health.recovery.DEFAULT,
};

export const IntelligencePanel = memo(function IntelligencePanel({
  title,
  icon,
  iconColor,
  confidence,
  summary,
  explanation,
  reasoning,
  source,
  type = "insight",
}: IntelligencePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = iconColor || typeColors[type];
  const hasExpandable = !!(explanation || (reasoning && reasoning.length > 0));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Main Content */}
      <button
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3"
        onClick={() => hasExpandable && setExpanded(!expanded)}
        style={{ cursor: hasExpandable ? "pointer" : "default" }}
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${accentColor}15` }}
        >
          <i
            className={`fas ${icon || "fa-lightbulb"} text-sm`}
            style={{ color: accentColor }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-semibold text-sm"
              style={{ color: theme.colors.text.primary }}
            >
              {title}
            </span>
            {confidence !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{
                  background: `${accentColor}15`,
                  color: accentColor,
                  fontSize: "0.6rem",
                }}
              >
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: theme.colors.text.muted }}
          >
            {summary}
          </p>
          {source && (
            <span
              className="mt-1.5 inline-block text-xs"
              style={{ color: theme.colors.text.subtle }}
            >
              Source: {source}
            </span>
          )}
        </div>

        {/* Expand indicator */}
        {hasExpandable && (
          <motion.i
            className="fas fa-chevron-down text-xs mt-2 shrink-0"
            style={{ color: theme.colors.text.subtle }}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </button>

      {/* Expanded Explanation */}
      <AnimatePresence>
        {expanded && hasExpandable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 ml-11"
              style={{
                borderTop: `1px solid ${theme.colors.border[1]}`,
                paddingTop: "12px",
              }}
            >
              {explanation && (
                <p
                  className="text-sm leading-relaxed mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {explanation}
                </p>
              )}
              {reasoning && reasoning.length > 0 && (
                <ul className="space-y-1">
                  {reasoning.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs"
                      style={{ color: theme.colors.text.muted }}
                    >
                      <div
                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{ background: accentColor }}
                      />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

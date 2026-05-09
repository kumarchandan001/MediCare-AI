/**
 * HealthCard — Reusable glassmorphic card for health data display
 * Responsive, animated, theme-aware.
 */
import React from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { glass, cardVariants } from "@/theme";
import { fadeInUp, hoverLift } from "@/animations";

interface HealthCardProps {
  title?: string;
  badge?: React.ReactNode;
  icon?: string;
  iconColor?: string;
  variant?: "default" | "glass" | "elevated" | "accent";
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export function HealthCard({
  title,
  badge,
  icon,
  iconColor,
  variant = "default",
  children,
  className = "",
  noPadding = false,
  onClick,
}: HealthCardProps) {
  const styles = cardVariants[variant];
  const isInteractive = !!onClick;

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      {...(isInteractive ? hoverLift : {})}
      onClick={onClick}
      className={`overflow-hidden ${className}`}
      style={{
        ...styles,
        ...(isInteractive ? { cursor: "pointer" } : {}),
      }}
    >
      {/* Header */}
      {title && (
        <div
          className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
          style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: iconColor
                    ? `${iconColor}15`
                    : theme.colors.accent.subtle,
                }}
              >
                <i
                  className={`fas ${icon} text-xs`}
                  style={{ color: iconColor || theme.colors.accent.primary }}
                />
              </div>
            )}
            {!icon && (
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: theme.colors.accent.primary }}
              />
            )}
            <span
              className="font-bold uppercase tracking-widest truncate"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              {title}
            </span>
          </div>
          {badge && <div className="shrink-0 ml-2">{badge}</div>}
        </div>
      )}

      {/* Body */}
      <div className={noPadding ? "" : "p-4 sm:p-5"}>{children}</div>
    </motion.div>
  );
}

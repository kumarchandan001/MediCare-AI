/**
 * SectionHeader — Reusable dashboard section header with divider line
 */
import React from "react";
import { theme } from "@/config/theme";

interface SectionHeaderProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: string;
  iconColor?: string;
}

export function SectionHeader({ children, action, icon, iconColor }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && (
        <i
          className={`fas ${icon} text-xs`}
          style={{ color: iconColor || theme.colors.accent.primary }}
        />
      )}
      <span
        className="font-bold uppercase tracking-widest whitespace-nowrap"
        style={{
          fontSize: theme.typography.sizes.xxs,
          color: theme.colors.text.subtle,
        }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: theme.colors.border[1] }} />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * NetworkErrorFallback — Displayed when API/WebSocket fails
 */
import React from "react";
import { theme } from "@/config/theme";

interface NetworkErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function NetworkErrorFallback({
  message = "Unable to connect to the health intelligence server.",
  onRetry,
}: NetworkErrorFallbackProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center rounded-2xl"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
        minHeight: "200px",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: theme.colors.health.danger.bg,
          border: `1px solid ${theme.colors.health.danger.border}`,
        }}
      >
        <i
          className="fas fa-wifi text-xl"
          style={{ color: theme.colors.health.danger.DEFAULT }}
        />
      </div>
      <h3
        className="font-bold text-base mb-2"
        style={{ color: theme.colors.text.primary }}
      >
        Connection Issue
      </h3>
      <p
        className="text-sm max-w-sm mb-4"
        style={{ color: theme.colors.text.muted }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: theme.colors.accent.primary,
            color: theme.colors.bg.primary,
          }}
        >
          <i className="fas fa-rotate-right mr-2 text-xs" />
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * EmptyState — Intelligent empty state for data-less views
 */
interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = "fa-inbox",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: theme.colors.surface[3],
          border: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        <i className={`fas ${icon} text-lg`} style={{ color: theme.colors.text.subtle }} />
      </div>
      <h3 className="font-bold text-sm mb-1" style={{ color: theme.colors.text.secondary }}>
        {title}
      </h3>
      <p className="text-xs max-w-xs" style={{ color: theme.colors.text.subtle }}>
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

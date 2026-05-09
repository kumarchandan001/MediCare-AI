/**
 * SkeletonPulse — Reusable skeleton loading primitives
 * Themed for dark healthcare aesthetic.
 */
import React from "react";
import { theme } from "@/config/theme";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "16px",
  borderRadius = theme.radius.md,
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: theme.colors.surface[3],
      }}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.colors.surface[5]}40 50%, transparent 100%)`,
          transform: "translateX(-100%)",
        }}
      />
    </div>
  );
}

/** Card-shaped skeleton */
export function SkeletonCard({ height = "120px", className = "" }: { height?: string; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
        height,
      }}
    >
      <div className="p-4 space-y-3">
        <Skeleton width="40%" height="10px" />
        <Skeleton width="70%" height="24px" />
        <Skeleton width="90%" height="10px" />
      </div>
    </div>
  );
}

/** Metric card skeleton */
export function SkeletonMetric({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Skeleton width="28px" height="28px" borderRadius={theme.radius.sm} />
        <Skeleton width="60px" height="10px" />
      </div>
      <Skeleton width="80px" height="28px" className="mb-1" />
      <Skeleton width="50px" height="10px" />
    </div>
  );
}

/** Chart skeleton */
export function SkeletonChart({ height = "200px", className = "" }: { height?: string; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
        <Skeleton width="8px" height="8px" borderRadius="50%" />
        <Skeleton width="100px" height="10px" />
      </div>
      <div className="p-5 flex items-end gap-2" style={{ height }}>
        {[40, 65, 50, 80, 45, 70, 55].map((h, i) => (
          <Skeleton key={i} width="100%" height={`${h}%`} borderRadius="4px" />
        ))}
      </div>
    </div>
  );
}

/** Gauge skeleton */
export function SkeletonGauge({ size = 100 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton width={`${size}px`} height={`${size}px`} borderRadius="50%" />
      <Skeleton width="60px" height="10px" />
    </div>
  );
}

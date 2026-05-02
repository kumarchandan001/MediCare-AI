import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

// ── Base Skeleton ────────────────────────
export function Skeleton({
  className,
  variant = "rect",
  width,
  height,
  style,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-white/5 relative overflow-hidden";

  const variantStyles = {
    rect: "rounded-lg",
    text: "rounded",
    circle: "rounded-full",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{ width, height, ...style }}
    >
      {/* Shimmer effect */}
      <div
        className={
          "absolute inset-0 -translate-x-full " +
          "animate-[shimmer_1.5s_infinite] " +
          "bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
        }
      />
    </div>
  );
}

// ── Text lines skeleton ──────────────────
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="14px"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-[#00F5C8] text-[#080C0B] hover:bg-[#00D4A8] font-bold shadow-[0_0_20px_rgba(0,245,200,0.15)]",
    secondary:
      "bg-white/5 text-white/80 border border-white/10 hover:bg-white/[0.08] font-semibold",
    ghost: "text-white/60 hover:text-white hover:bg-white/5 font-medium",
    danger:
      "bg-[rgba(255,61,90,0.1)] text-[#FF3D5A] border border-[rgba(255,61,90,0.2)] hover:bg-[rgba(255,61,90,0.15)] font-semibold",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-xl gap-2",
    lg: "px-7 py-3.5 text-base rounded-xl gap-2.5",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 rounded-full border-2 border-current/20 border-t-current animate-spin" />
      ) : icon ? (
        <i className={cn(icon, "text-[0.85em]")} />
      ) : null}
      {children}
    </button>
  );
}

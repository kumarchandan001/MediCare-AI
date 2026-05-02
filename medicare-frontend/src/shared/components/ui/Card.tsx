import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "accent" | "green" | "blue" | "purple" | "red";
  padding?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function Card({
  children,
  className,
  hover = false,
  glow,
  padding = "md",
  onClick,
}: CardProps) {
  const paddings = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#0F1512]",
        "shadow-[0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.4)]",
        paddings[padding],
        hover && "hover:bg-[#1A2119] hover:border-white/[0.08] transition-all duration-200 cursor-pointer",
        glow === "accent" && "shadow-[0_0_20px_rgba(0,245,200,0.15)]",
        glow === "green" && "shadow-[0_0_20px_rgba(0,230,118,0.20)]",
        glow === "blue" && "shadow-[0_0_20px_rgba(0,180,255,0.20)]",
        glow === "purple" && "shadow-[0_0_20px_rgba(156,111,255,0.20)]",
        glow === "red" && "shadow-[0_0_20px_rgba(255,61,90,0.20)]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

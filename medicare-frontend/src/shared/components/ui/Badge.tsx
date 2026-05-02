import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-white/5 text-white/60 border-white/10",
    success: "bg-[rgba(0,230,118,0.08)] text-[#00E676] border-[rgba(0,230,118,0.15)]",
    warning: "bg-[rgba(255,179,0,0.08)] text-[#FFB300] border-[rgba(255,179,0,0.15)]",
    danger: "bg-[rgba(255,61,90,0.08)] text-[#FF3D5A] border-[rgba(255,61,90,0.15)]",
    info: "bg-[rgba(0,180,255,0.08)] text-[#00B4FF] border-[rgba(0,180,255,0.15)]",
    accent: "bg-[rgba(0,245,200,0.06)] text-[#00F5C8] border-[rgba(0,245,200,0.20)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[0.625rem]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

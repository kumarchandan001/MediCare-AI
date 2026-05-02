import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function SpinnerLoader({ size = "md", className }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
  };

  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        "border-white/10",
        "border-t-[#00F5C8]",
        sizes[size],
        className
      )}
    />
  );
}

// ── Inline loading state ─────────────────
export function InlineLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-white/40 text-sm py-4 justify-center">
      <SpinnerLoader size="sm" />
      <span>{text}</span>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface PulseLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PulseLoader({ size = "md", className }: PulseLoaderProps) {
  const sizes = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div className={cn("flex items-center", sizes[size], className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("rounded-full bg-[#00F5C8]", dotSizes[size])}
          style={{
            animation: "pulse-dot 1.4s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

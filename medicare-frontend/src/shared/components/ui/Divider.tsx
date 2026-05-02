import { cn } from "@/lib/utils";

interface DividerProps {
  className?: string;
  label?: string;
}

export function Divider({ className, label }: DividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-white/20 text-[0.625rem] font-bold uppercase tracking-[0.12em]">
          {label}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
    );
  }

  return <div className={cn("h-px bg-white/5", className)} />;
}

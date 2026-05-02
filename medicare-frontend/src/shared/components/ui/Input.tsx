import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[0.625rem] font-bold uppercase tracking-[0.12em] text-white/40"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <i
              className={cn(
                icon,
                "absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm"
              )}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-xl border bg-[#0F1512] px-4 py-3 text-sm text-white/90",
              "placeholder:text-white/20",
              "outline-none transition-all duration-200",
              "focus:border-[rgba(0,245,200,0.50)] focus:ring-1 focus:ring-[rgba(0,245,200,0.20)]",
              error
                ? "border-[rgba(255,61,90,0.3)]"
                : "border-white/[0.08] hover:border-white/[0.12]",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[#FF3D5A] text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

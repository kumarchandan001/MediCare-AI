import { useEffect, useRef } from "react";
import { theme } from "@/config/theme";

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
  animate?: boolean;
}

export function ScoreRing({
  value,
  max = 100,
  size = 160,
  strokeWidth = 10,
  color,
  label,
  sublabel,
  animate = true,
}: ScoreRingProps) {
  const fillRef = useRef<SVGCircleElement>(null);
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const dashArray = pct * circumference;

  useEffect(() => {
    if (!fillRef.current || !animate) return;
    fillRef.current.style.strokeDasharray = `0 ${circumference}`;
    const timer = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.transition = `stroke-dasharray ${theme.animation.ring} cubic-bezier(0.34,1.2,0.64,1)`;
        fillRef.current.style.strokeDasharray = `${dashArray} ${circumference}`;
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, dashArray, circumference, animate]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        overflow="visible"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          ref={fillRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={
            animate ? `0 ${circumference}` : `${dashArray} ${circumference}`
          }
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="font-black leading-none"
          style={{
            fontSize: theme.typography.sizes.metricMD,
            color: theme.colors.text.primary,
            letterSpacing: "-0.05em",
          }}
        >
          {Math.round(value)}
        </span>
        {sublabel && (
          <span
            className="mt-1 font-bold uppercase tracking-widest"
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

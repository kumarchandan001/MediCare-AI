/**
 * TwinStateVisualizer — Multidimensional radar-style twin state
 *
 * Renders the digital twin's current state across multiple dimensions
 * using SVG polygons. Calm, read-at-a-glance design.
 */
import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { fadeInUp } from "@/animations";

interface TwinDimension {
  label: string;
  value: number;   // 0–100
  color: string;
}

interface TwinStateVisualizerProps {
  dimensions: TwinDimension[];
  size?: number;
  compact?: boolean;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

export const TwinStateVisualizer = memo(function TwinStateVisualizer({
  dimensions,
  size = 200,
  compact = false,
}: TwinStateVisualizerProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const n = dimensions.length;

  // Grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon
  const dataPoints = useMemo(() => {
    return dimensions.map((d, i) => {
      const angle = (360 / n) * i;
      const r = (d.value / 100) * maxR;
      return polarToCartesian(cx, cy, r, angle);
    });
  }, [dimensions, cx, cy, maxR, n]);

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Label positions (slightly outside the chart)
  const labelPositions = dimensions.map((_, i) => {
    const angle = (360 / n) * i;
    return polarToCartesian(cx, cy, maxR + (compact ? 18 : 24), angle);
  });

  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => {
              const angle = (360 / n) * i;
              const pt = polarToCartesian(cx, cy, maxR * r, angle);
              return `${pt.x},${pt.y}`;
            }).join(" ")}
            fill="none"
            stroke={theme.colors.border[1]}
            strokeWidth={0.5}
          />
        ))}

        {/* Axes */}
        {dimensions.map((_, i) => {
          const angle = (360 / n) * i;
          const end = polarToCartesian(cx, cy, maxR, angle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke={theme.colors.border[1]}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon (filled) */}
        <motion.path
          d={dataPath}
          fill={`${theme.colors.accent.primary}12`}
          stroke={theme.colors.accent.primary}
          strokeWidth={1.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={dimensions[i].color}
            stroke={theme.colors.surface[2]}
            strokeWidth={1.5}
          />
        ))}

        {/* Labels */}
        {labelPositions.map((pos, i) => (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={theme.colors.text.subtle}
            fontSize={compact ? 7 : 9}
            fontWeight={600}
            fontFamily={theme.typography.fonts.primary}
          >
            {dimensions[i].label}
          </text>
        ))}
      </svg>

      {/* Legend row */}
      {!compact && (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                {d.label}: {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

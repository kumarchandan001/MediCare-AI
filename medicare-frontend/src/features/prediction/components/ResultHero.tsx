import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { theme } from "@/config/theme";
import type { PredictionResult } from "../types/prediction.types";

interface ResultHeroProps {
  result: PredictionResult;
}

export function ResultHero({ result }: ResultHeroProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    const t = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.transition =
          "width 1s cubic-bezier(0.4,0,0.2,1)";
        barRef.current.style.width = `${result.confidence}%`;
      }
    }, 400);
    return () => clearTimeout(t);
  }, [result.confidence]);

  const confidenceColor =
    result.confidence >= 80
      ? theme.colors.health.recovery.DEFAULT
      : result.confidence >= 60
        ? theme.colors.health.warning.DEFAULT
        : theme.colors.health.danger.DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
      className="relative rounded-2xl p-8 text-center overflow-hidden mb-5"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.surface[3]} 0%, rgba(0,245,200,0.04) 100%)`,
        border: `1px solid ${theme.colors.accent.border}`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${theme.colors.accent.subtle}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Disease name */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-black tracking-tight mb-5"
          style={{
            fontSize: theme.typography.sizes.display,
            color: theme.colors.text.primary,
            letterSpacing: "-0.04em",
          }}
        >
          {result.predicted_disease}
        </motion.h2>

        {/* Confidence row */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Confidence pill */}
          <div
            className="flex items-baseline gap-1 px-6 py-3 rounded-full"
            style={{
              background: theme.colors.accent.subtle,
              border: `1px solid ${theme.colors.accent.border}`,
            }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-black"
              style={{
                fontSize: "1.75rem",
                color: theme.colors.accent.primary,
                letterSpacing: "-0.04em",
              }}
            >
              {result.confidence.toFixed(1)}
            </motion.span>
            <span
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.subtle,
              }}
            >
              %
            </span>
            <span
              className="ml-1 font-bold uppercase tracking-widest"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              Confidence
            </span>
          </div>

          {/* Evidence badge */}
          <div
            className="px-4 py-2 rounded-full font-bold uppercase tracking-widest"
            style={{
              fontSize: theme.typography.sizes.xxs,
              background: theme.colors.surface[4],
              color: theme.colors.text.muted,
              border: `1px solid ${theme.colors.border[2]}`,
            }}
          >
            {result.xai.evidence_strength} Evidence
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-5 flex items-center gap-3 max-w-xs mx-auto">
          <span
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            0%
          </span>
          <div
            className="flex-1 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              ref={barRef}
              className="h-full rounded-full"
              style={{
                width: "0%",
                background: confidenceColor,
                boxShadow: `0 0 8px ${confidenceColor}`,
              }}
            />
          </div>
          <span
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            100%
          </span>
        </div>

        {/* Description */}
        {result.description && (
          <p
            className="mt-5 max-w-xl mx-auto leading-relaxed"
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.muted,
            }}
          >
            {result.description}
          </p>
        )}

        {/* Precautions */}
        {result.precautions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {result.precautions.map((p, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: theme.colors.surface[4],
                  color: theme.colors.text.muted,
                  border: `1px solid ${theme.colors.border[1]}`,
                }}
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

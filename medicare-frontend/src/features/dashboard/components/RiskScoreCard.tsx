import { theme, getScoreColor } from "@/config/theme";
import { ScoreRing } from "./ScoreRing";
import { CardSkeleton } from "@/shared/components/skeleton/CardSkeleton";
import type { RiskScore as RiskScoreType } from "../types/dashboard.types";

interface RiskScoreProps {
  data: RiskScoreType | undefined;
  isLoading: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  low: "LOW RISK",
  moderate: "MODERATE",
  high: "HIGH RISK",
  critical: "CRITICAL",
  unknown: "NO DATA",
};

export function RiskScoreCard({ data, isLoading }: RiskScoreProps) {
  if (isLoading) return <CardSkeleton />;
  if (!data) return null;

  const color =
    data.score === 0
      ? theme.colors.text.subtle
      : getScoreColor(100 - data.score);

  return (
    <div className="flex flex-col items-center text-center">
      <ScoreRing
        value={data.score}
        max={100}
        color={color}
        label="Risk"
        size={160}
        strokeWidth={10}
      />

      <span
        className="font-bold uppercase tracking-widest mt-3 mb-4"
        style={{
          fontSize: theme.typography.sizes.xxs,
          color: color,
        }}
      >
        {LEVEL_LABELS[data.level] || data.level.toUpperCase()}
      </span>

      {data.reasons.length > 0 && (
        <div className="w-full text-left space-y-2">
          {data.reasons.map((reason, i) => (
            <div
              key={i}
              className="flex items-start gap-2"
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.muted,
              }}
            >
              <span
                style={{
                  color: theme.colors.accent.primary,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
              {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

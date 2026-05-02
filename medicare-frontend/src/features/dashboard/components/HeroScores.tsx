import { motion } from "framer-motion";
import { ScoreRing } from "./ScoreRing";
import { HeroScoreSkeleton } from "@/shared/components/skeleton/HeroScoreSkeleton";
import { theme } from "@/config/theme";
import type { HealthSummary, RiskScore } from "../types/dashboard.types";

interface HeroScoresProps {
  summary: HealthSummary | undefined;
  riskScore: RiskScore | undefined;
  isLoading: boolean;
}

export function HeroScores({ summary, riskScore, isLoading }: HeroScoresProps) {
  if (isLoading) return <HeroScoreSkeleton />;

  const recoveryScore = summary
    ? Math.min(Math.round((summary.sleep / 9) * 100), 100)
    : 0;

  const strainScore = summary
    ? Math.min(Math.round((summary.steps / 15000) * 21.4 * 10) / 10, 21.4)
    : 0;

  const sleepVal = summary?.sleep ?? 0;

  const scores = [
    {
      key: "recovery",
      label: "RECOVERY",
      value: recoveryScore,
      max: 100,
      color: theme.colors.health.recovery.DEFAULT,
      sublabel: getRecoveryLabel(recoveryScore),
      shadow: theme.shadows.green,
    },
    {
      key: "strain",
      label: "DAY STRAIN",
      value: strainScore,
      max: 21.4,
      color: theme.colors.health.strain.DEFAULT,
      sublabel: getStrainLabel(strainScore),
      shadow: theme.shadows.blue,
    },
    {
      key: "sleep",
      label: "SLEEP",
      value: sleepVal,
      max: 9,
      color: theme.colors.health.sleep.DEFAULT,
      sublabel: getSleepLabel(sleepVal),
      shadow: theme.shadows.purple,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {scores.map((score, i) => (
        <motion.div
          key={score.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.1,
            duration: 0.4,
            ease: [0, 0, 0.2, 1],
          }}
          className="relative flex flex-col items-center text-center rounded-2xl p-6 cursor-default"
          style={{
            background: theme.colors.surface[2],
            border: `1px solid ${theme.colors.border[1]}`,
          }}
          whileHover={{ y: -3, borderColor: theme.colors.border[2] }}
        >
          {/* Label */}
          <span
            className="font-bold tracking-widest mb-4 uppercase"
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            {score.label}
          </span>

          {/* Ring */}
          <ScoreRing
            value={score.value}
            max={score.max}
            color={score.color}
            label={score.label}
            sublabel={score.sublabel}
            size={140}
            strokeWidth={8}
          />

          {/* Bottom glow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 rounded-b-2xl pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${score.color}08, transparent)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function getRecoveryLabel(score: number): string {
  if (score >= 80) return "OPTIMAL";
  if (score >= 66) return "GOOD";
  if (score >= 33) return "MODERATE";
  return "LOW";
}

function getStrainLabel(score: number): string {
  if (score >= 18) return "ALL OUT";
  if (score >= 14) return "STRENUOUS";
  if (score >= 10) return "MODERATE";
  if (score >= 5) return "LIGHT";
  return "EASY";
}

function getSleepLabel(hours: number): string {
  if (hours >= 8) return "OPTIMAL";
  if (hours >= 7) return "SUFFICIENT";
  if (hours >= 5) return "INSUFFICIENT";
  return "CRITICAL";
}

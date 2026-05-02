import { AnimatePresence, motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useReports } from "../hooks/useReports";
import { PeriodSelector } from "../components/PeriodSelector";
import { StatCompareCard } from "../components/StatCompareCard";
import { TrendLineChart } from "../components/TrendLineChart";
import { AISummaryCard } from "../components/AISummaryCard";
import { StreakCard } from "../components/StreakCard";
import { HealthScoreCard } from "../components/HealthScoreCard";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";
import { ChartSkeleton } from "@/shared/components/skeleton/ChartSkeleton";

/* ── Section label ─────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="font-bold uppercase tracking-widest flex-shrink-0"
        style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: theme.colors.border[1] }} />
    </div>
  );
}

/* ── Chart card wrapper ────────────────── */
function ChartCard({
  title,
  color,
  icon,
  children,
}: {
  title: string;
  color: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <i className={`fas ${icon} text-xs`} style={{ color }} />
        </div>
        <span
          className="font-bold uppercase tracking-widest"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          {title}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN REPORTS PAGE
   ══════════════════════════════════════════ */
export default function ReportsPage() {
  const {
    period, setPeriod,
    overview, overviewLoading,
    trends, trendsLoading,
    aiSummary, aiSummaryLoading,
    stats, statsLoading,
  } = useReports();

  const STAT_CONFIGS = overview
    ? [
        { stat: overview.sleep, icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT },
        { stat: overview.heart_rate, icon: "fa-heart-pulse", color: theme.colors.health.danger.DEFAULT },
        { stat: overview.oxygen, icon: "fa-lungs", color: theme.colors.health.strain.DEFAULT },
        { stat: overview.stress, icon: "fa-brain", color: theme.colors.health.warning.DEFAULT },
        { stat: overview.steps, icon: "fa-person-walking", color: theme.colors.accent.primary },
        ...(overview.bmi
          ? [{ stat: overview.bmi, icon: "fa-weight-scale", color: theme.colors.health.recovery.DEFAULT }]
          : []),
      ]
    : [];

  const CHART_CONFIGS = trends
    ? [
        { series: trends.sleep, title: "Sleep Duration", icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT },
        { series: trends.heart_rate, title: "Heart Rate", icon: "fa-heart-pulse", color: theme.colors.health.danger.DEFAULT },
        { series: trends.steps, title: "Daily Steps", icon: "fa-person-walking", color: theme.colors.accent.primary },
        { series: trends.oxygen, title: "Oxygen Saturation (SpO2)", icon: "fa-lungs", color: theme.colors.health.strain.DEFAULT },
        { series: trends.stress, title: "Stress Level", icon: "fa-brain", color: theme.colors.health.warning.DEFAULT },
      ]
    : [];

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* ── Page Header ──────────────── */}
        <div
          className="flex items-center justify-between flex-wrap gap-4 p-5 rounded-2xl mb-6"
          style={{
            background: theme.colors.surface[2],
            border: `1px solid ${theme.colors.accent.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: theme.colors.accent.subtle,
                border: `1px solid ${theme.colors.accent.border}`,
              }}
            >
              <i className="fas fa-chart-line text-lg" style={{ color: theme.colors.accent.primary }} />
            </div>
            <div>
              <h1
                className="font-black tracking-tight"
                style={{
                  fontSize: theme.typography.sizes.h2,
                  color: theme.colors.text.primary,
                  letterSpacing: "-0.02em",
                }}
              >
                Health Reports
              </h1>
              <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                Trends · Insights · AI Analysis
              </p>
            </div>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* ── Metric Comparison Cards ───── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SectionLabel>{period}-Day Averages vs Previous Period</SectionLabel>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {overviewLoading
                ? [1, 2, 3, 4, 5, 6].map((i) => <MetricCardSkeleton key={i} />)
                : STAT_CONFIGS.map((cfg, i) => (
                    <StatCompareCard
                      key={cfg.stat.label}
                      stat={cfg.stat}
                      icon={cfg.icon}
                      color={cfg.color}
                      index={i}
                    />
                  ))}
            </div>

            {/* ── Two-column layout ──────── */}
            <div className="grid gap-6 mb-8 lg:grid-cols-[1fr_320px] grid-cols-1">
              {/* Left: AI Summary */}
              <AISummaryCard data={aiSummary} isLoading={aiSummaryLoading} />

              {/* Right: Score + Consistency */}
              <div className="space-y-5">
                <HealthScoreCard overview={overview} isLoading={overviewLoading} />

                {/* Logging consistency bar */}
                {overview && (
                  <div
                    className="p-5 rounded-2xl"
                    style={{
                      background: theme.colors.surface[2],
                      border: `1px solid ${theme.colors.border[1]}`,
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className="font-bold uppercase tracking-widest"
                        style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
                      >
                        Logging Consistency
                      </span>
                      <span
                        className="font-black"
                        style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.accent.primary }}
                      >
                        {overview.completion_pct.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden mb-2"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${overview.completion_pct}%` }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          background: theme.colors.accent.primary,
                          boxShadow: theme.shadows.accent,
                        }}
                      />
                    </div>
                    <p style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                      {overview.active_days} of {overview.period_days} days logged
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Streak Card ───────────── */}
            <div className="mb-8">
              <SectionLabel>Consistency & Stats</SectionLabel>
              <StreakCard stats={stats} isLoading={statsLoading} />
            </div>

            {/* ── Trend Charts ──────────── */}
            <SectionLabel>{period}-Day Trend Charts</SectionLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {trendsLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <div key={i}>
                      <ChartSkeleton height={200} />
                    </div>
                  ))
                : CHART_CONFIGS.map((cfg) => (
                    <ChartCard key={cfg.title} title={cfg.title} color={cfg.color} icon={cfg.icon}>
                      <TrendLineChart series={cfg.series} isLoading={false} height={200} />
                    </ChartCard>
                  ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
